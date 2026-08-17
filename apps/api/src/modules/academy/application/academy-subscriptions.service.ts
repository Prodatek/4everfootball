import { BadRequestException, Injectable } from '@nestjs/common';
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

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + SUBSCRIPTION_DAYS);

    return this.prisma.academySubscription.create({
      data: {
        organisationId: params.organisationId,
        planKey: params.planKey,
        startDate,
        endDate,
        invoiceId: invoice.id,
      },
    });
  }

  async currentForOrganisation(organisationId: string) {
    return this.prisma.academySubscription.findFirst({
      where: { organisationId, endDate: { gte: new Date() } },
      orderBy: { startDate: 'desc' },
      include: { invoice: true },
    });
  }
}
