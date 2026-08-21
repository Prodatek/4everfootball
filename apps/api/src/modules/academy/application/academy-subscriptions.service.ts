import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AcademyPlanKey } from '@prisma/client';
import { ACADEMY_PLANS, ANNUAL_PREPAY_DISCOUNT } from '@4ef/shared';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { InvoicesService } from '../../invoices/application/invoices.service';

const SUBSCRIPTION_DAYS = 365;

/**
 * Brief §5.2: "Annual plans banded by squad size; invoiced annually, 20%
 * prepay discount. No monthly card billing." — invoiced (Phase 2's
 * InvoicesModule), never a Paystack card charge; "no monthly card
 * billing" is enforced simply by there being no code path here that ever
 * calls PaymentsService/PaystackClientService at all.
 *
 * Choosing a plan and activating it are deliberately two different steps
 * (this used to be one step, with no payment gate at all — a real
 * reliability bug, since the subscription was granted the instant a plan
 * was picked, before any money changed hands). subscribe() only ever
 * creates an invoice + AcademySubscriptionRequest; the AcademySubscription
 * itself is created exclusively by confirmAndActivate(), the same
 * "a human confirmed real money arrived" gate every other payment flow in
 * this app already goes through.
 */
@Injectable()
export class AcademySubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoicesService: InvoicesService,
  ) {}

  async subscribe(params: {
    organisationId: string;
    planKey: AcademyPlanKey;
    prepay: boolean;
  }) {
    const plan = ACADEMY_PLANS[params.planKey];

    const currentSquadSize = await this.prisma.player.count({
      where: {
        team: { organisationId: params.organisationId },
        isActive: true,
      },
    });

    if (currentSquadSize > plan.maxPlayers) {
      throw new BadRequestException(
        `This organisation has ${currentSquadSize} active players, which exceeds the ${params.planKey} plan's limit of ${plan.maxPlayers}`,
      );
    }

    const pending = await this.prisma.academySubscriptionRequest.findFirst({
      where: { organisationId: params.organisationId, activatedAt: null },
    });

    if (pending) {
      throw new BadRequestException(
        'A plan request for this organisation is already awaiting payment confirmation',
      );
    }

    const discountKobo = params.prepay
      ? Math.round(plan.priceKobo * ANNUAL_PREPAY_DISCOUNT)
      : 0;

    const invoice = await this.invoicesService.create({
      organisationId: params.organisationId,
      lines: [
        {
          description: `${params.planKey} annual academy plan (up to ${plan.maxPlayers} players)`,
          basis: 'academy-plan',
          quantity: 1,
          unitKobo: plan.priceKobo,
        },
      ],
      discountKobo,
    });

    // Awaiting payment, not a perpetual draft — matches how a real quote
    // reads to the organiser (Invoice DRAFT means "not sent yet", which
    // this already has been, conceptually).
    await this.invoicesService.issue(invoice.id);

    return this.prisma.academySubscriptionRequest.create({
      data: {
        organisationId: params.organisationId,
        planKey: params.planKey,
        prepay: params.prepay,
        invoiceId: invoice.id,
      },
      include: { invoice: { include: { lines: true } } },
    });
  }

  async currentForOrganisation(organisationId: string) {
    return this.prisma.academySubscription.findFirst({
      where: { organisationId, endDate: { gte: new Date() } },
      orderBy: { startDate: 'desc' },
      include: { invoice: true },
    });
  }

  // §5 F5: the organiser's own view of "we picked a plan, still waiting on
  // confirmation" — distinct from currentForOrganisation(), which only
  // ever reflects an already-activated plan.
  async pendingForOrganisation(organisationId: string) {
    return this.prisma.academySubscriptionRequest.findFirst({
      where: { organisationId, activatedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { invoice: { include: { lines: true } } },
    });
  }

  // §5 F5: "invoices" (plural) — currentForOrganisation() above only ever
  // returns the single active row. One row per year, append-only (see the
  // model's own comment), so billing history is just every row, newest first.
  async listForOrganisation(organisationId: string) {
    return this.prisma.academySubscription.findMany({
      where: { organisationId },
      orderBy: { startDate: 'desc' },
      include: { invoice: true },
    });
  }

  // Internal/D2-only: every organisation's plan choice still waiting on a
  // platform admin to confirm the money actually arrived.
  async listPendingRequests() {
    return this.prisma.academySubscriptionRequest.findMany({
      where: { activatedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        invoice: true,
        organisation: { select: { name: true } },
      },
    });
  }

  /**
   * The confirmation gate itself. One atomic action for a platform admin:
   * "yes, this organisation's academy invoice is paid" — records the full
   * invoice amount as paid (idempotent no-op if it's already PAID, e.g. via
   * a separate manual invoice payment) and only then creates the real
   * AcademySubscription, exactly mirroring PaymentsService.confirmBankTransfer
   * → fulfilPayment()'s "confirm, then grant" shape used everywhere else.
   */
  async confirmAndActivate(requestId: string) {
    const request = await this.prisma.academySubscriptionRequest.findUnique({
      where: { id: requestId },
      include: { invoice: true },
    });

    if (!request) {
      throw new NotFoundException('Subscription request not found');
    }

    if (request.activatedAt) {
      throw new BadRequestException('This request has already been activated');
    }

    if (request.invoice.status !== 'PAID') {
      await this.invoicesService.recordPayment(
        request.invoiceId,
        request.invoice.totalKobo,
      );
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + SUBSCRIPTION_DAYS);

    const subscription = await this.prisma.academySubscription.create({
      data: {
        organisationId: request.organisationId,
        planKey: request.planKey,
        startDate,
        endDate,
        invoiceId: request.invoiceId,
      },
    });

    await this.prisma.academySubscriptionRequest.update({
      where: { id: requestId },
      data: { activatedAt: new Date() },
    });

    return subscription;
  }
}
