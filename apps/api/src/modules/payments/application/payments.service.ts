import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { PaymentProvider, PaymentPurpose, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { paginate } from '../../../common/dto/paginated-result';
import { PaystackClientService } from '../infrastructure/paystack-client.service';
import {
  MEDIA_PACK_COMPETITION_SUBJECT_TYPE,
  MEDIA_PACK_ORGANISATION_SUBJECT_TYPE,
} from '../domain/add-on-subjects';

export interface InitializePaymentInput {
  organisationId: string;
  provider: PaymentProvider;
  purpose: PaymentPurpose;
  subjectType: string;
  subjectId: string;
  /**
   * Computed by the CALLER (e.g. PlayerRegistrationService summing
   * PlayerRegistration.priceKobo snapshots, or a licence fee straight from
   * pricing.ts) — PaymentsService never accepts or trusts a client-supplied
   * amount. This is the enforcement point for "amounts are always
   * recomputed server-side" (§3.5): by the time anything reaches here, the
   * amount already came from a domain service reading pricing.ts, never
   * from a request body.
   */
  amountKobo: number;
  payerEmail: string;
}

function generateReference(): string {
  return `4EF-${randomBytes(8).toString('hex')}`;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackClientService,
  ) {}

  /**
   * §3.5's flow: create a PENDING payment with our own reference FIRST,
   * then call Paystack — so a payment row always exists even if the
   * Paystack call itself fails partway (network error, etc.), rather than
   * money potentially changing hands with nothing recorded on our side yet.
   */
  async initialize(input: InitializePaymentInput) {
    if (input.amountKobo <= 0) {
      throw new BadRequestException('amountKobo must be positive');
    }

    const reference = generateReference();

    const payment = await this.prisma.payment.create({
      data: {
        organisationId: input.organisationId,
        reference,
        provider: input.provider,
        amountKobo: input.amountKobo,
        purpose: input.purpose,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        status: 'PENDING',
      },
    });

    if (input.provider === 'BANK_TRANSFER') {
      // No Paystack call for a transfer — an admin confirms it manually
      // later via confirmBankTransfer(), same fulfilPayment() path.
      return { payment, authorizationUrl: null as string | null };
    }

    if (input.provider === 'CASH') {
      return { payment, authorizationUrl: null as string | null };
    }

    const result = await this.paystack.initialize({
      email: input.payerEmail,
      amountKobo: input.amountKobo,
      reference,
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { providerReference: result.reference },
    });

    return { payment, authorizationUrl: result.authorizationUrl };
  }

  async findByReference(reference: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { reference },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  /**
   * The ONE fulfilment path — called identically by the Paystack webhook
   * handler and by an admin confirming a bank transfer (§3.6: "It must run
   * the exact same fulfilment code path as a Paystack webhook. Two
   * divergent paths is how customers end up paid-but-not-provisioned.").
   *
   * Idempotent: a payment already PAID is a silent no-op, so calling this
   * ten times (webhook retries) fulfils exactly once. The row lock inside
   * the transaction closes the race a plain status check alone wouldn't —
   * two concurrent calls (e.g. a webhook retry landing mid-flight) can't
   * both observe PENDING and both proceed.
   */
  async fulfilPayment(paymentId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "payments" WHERE id = ${paymentId} FOR UPDATE`;

      const payment = await tx.payment.findUnique({ where: { id: paymentId } });

      if (!payment) {
        this.logger.warn(
          `fulfilPayment called for missing payment ${paymentId}`,
        );
        return;
      }

      if (payment.status === 'PAID') {
        return; // already fulfilled — the idempotency guarantee
      }

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'PAID', paidAt: new Date() },
      });

      if (payment.purpose === 'PLAYER_REGISTRATION') {
        await tx.playerRegistration.updateMany({
          where: {
            paymentId: payment.id,
            status: { in: ['PENDING_PAYMENT', 'DRAFT'] },
          },
          data: { status: 'CONFIRMED' },
        });
      } else if (payment.purpose === 'LICENCE') {
        await tx.competition.update({
          where: { id: payment.subjectId },
          data: { licenceStatus: 'LICENSED' },
        });
      } else if (
        payment.purpose === 'ADD_ON' &&
        (payment.subjectType === MEDIA_PACK_ORGANISATION_SUBJECT_TYPE ||
          payment.subjectType === MEDIA_PACK_COMPETITION_SUBJECT_TYPE)
      ) {
        // Phase 3 (brief §4): grants the Club Media Pack entitlement.
        // Plain create, not upsert — the status==='PAID' early return
        // above already guarantees this branch only runs once per
        // payment, and sourcePaymentId is unique, so a second create
        // attempt would fail loudly rather than silently double-grant.
        await tx.mediaPackEntitlement.create({
          data: {
            organisationId: payment.organisationId,
            competitionId:
              payment.subjectType === MEDIA_PACK_COMPETITION_SUBJECT_TYPE
                ? payment.subjectId
                : null,
            sourcePaymentId: payment.id,
          },
        });
      }
      // Other ADD_ONS SKUs (dev reports, sponsor dashboard, ...) and
      // ACADEMY_PLAN/ONBOARDING: no fulfilment action yet — those features
      // are the brief's Phase 4/5, out of scope here. The Payment is still
      // correctly marked PAID; there's just nothing downstream to activate
      // for these purposes yet.
    });
  }

  /**
   * §3.6: admin marks an invoice/payment paid by transfer, attaching a
   * reference and optionally a proof image, and it's logged who confirmed
   * it. Runs the exact same fulfilPayment() as the webhook.
   */
  async confirmBankTransfer(
    paymentId: string,
    confirmedByUserId: string,
    details: {
      providerReference?: string;
      transferProofUrl?: string;
      transferNote?: string;
    },
  ): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.provider !== 'BANK_TRANSFER' && payment.provider !== 'CASH') {
      throw new BadRequestException(
        'confirmBankTransfer only applies to BANK_TRANSFER/CASH payments — Paystack payments are confirmed by webhook or verify',
      );
    }

    // §5 B6: "a manual override for the club that paid cash at the venue —
    // which must capture a reason." CASH has no bank reference/proof to
    // fall back on the way a transfer does, so the note is the only record
    // of why this was marked paid — required, not optional, for this path.
    if (payment.provider === 'CASH' && !details.transferNote?.trim()) {
      throw new BadRequestException(
        'A reason is required to mark a cash payment as paid',
      );
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        confirmedById: confirmedByUserId,
        providerReference: details.providerReference,
        transferProofUrl: details.transferProofUrl,
        transferNote: details.transferNote,
      },
    });

    await this.fulfilPayment(paymentId);
  }

  // §5 D1: "payment history" for an organiser's billing centre.
  async listForOrganisation(
    organisationId: string,
    page: number,
    limit: number,
    status?: PaymentStatus,
  ) {
    const where = { organisationId, ...(status ? { status } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  // §5 D2: "payments needing reconciliation" — every payment still PENDING,
  // oldest first. BANK_TRANSFER/CASH never resolve without a human (the
  // manual mark-paid-by-transfer action); PAYSTACK ones are also stale
  // candidates the 10-minute job (PaymentReconciliationService) hasn't
  // resolved yet — surfaced here for visibility either way.
  async listNeedingReconciliation() {
    return this.prisma.payment.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: { organisation: { select: { name: true } } },
    });
  }

  /**
   * §5 D2: "Cash collected, outstanding, by competition and by
   * organisation." Competition attribution differs by purpose — LICENCE
   * payments point straight at a competition (subjectId IS the
   * competitionId); PLAYER_REGISTRATION payments point at a team
   * (subjectId is a teamId), so the competition comes from the
   * PlayerRegistration rows that payment funded instead. Everything else
   * (ADD_ON, ACADEMY_PLAN, ONBOARDING) has no competition to attribute to
   * and only counts toward the organisation totals.
   */
  async getRevenueSummary() {
    const [paidPayments, pendingByOrg] = await Promise.all([
      this.prisma.payment.findMany({
        where: { status: 'PAID' },
        select: {
          id: true,
          amountKobo: true,
          purpose: true,
          subjectId: true,
          organisationId: true,
          organisation: { select: { name: true } },
        },
      }),
      this.prisma.payment.groupBy({
        by: ['organisationId'],
        where: { status: 'PENDING' },
        _sum: { amountKobo: true },
      }),
    ]);

    const registrationPaymentIds = paidPayments
      .filter((p) => p.purpose === 'PLAYER_REGISTRATION')
      .map((p) => p.id);

    const registrations = registrationPaymentIds.length
      ? await this.prisma.playerRegistration.findMany({
          where: { paymentId: { in: registrationPaymentIds } },
          select: {
            paymentId: true,
            competitionId: true,
            competition: { select: { name: true } },
          },
        })
      : [];
    const competitionByPaymentId = new Map(
      registrations
        .filter((r) => r.paymentId)
        .map((r) => [r.paymentId as string, { id: r.competitionId, name: r.competition.name }]),
    );

    const licenceCompetitionIds = [
      ...new Set(
        paidPayments.filter((p) => p.purpose === 'LICENCE').map((p) => p.subjectId),
      ),
    ];
    const licenceCompetitions = licenceCompetitionIds.length
      ? await this.prisma.competition.findMany({
          where: { id: { in: licenceCompetitionIds } },
          select: { id: true, name: true },
        })
      : [];
    const licenceCompetitionNameById = new Map(
      licenceCompetitions.map((c) => [c.id, c.name]),
    );

    const byOrganisation = new Map<
      string,
      { organisationId: string; name: string; collectedKobo: number }
    >();
    const byCompetition = new Map<
      string,
      { competitionId: string; name: string; collectedKobo: number }
    >();
    let totalCollectedKobo = 0;

    for (const payment of paidPayments) {
      totalCollectedKobo += payment.amountKobo;

      const org = byOrganisation.get(payment.organisationId) ?? {
        organisationId: payment.organisationId,
        name: payment.organisation.name,
        collectedKobo: 0,
      };
      org.collectedKobo += payment.amountKobo;
      byOrganisation.set(payment.organisationId, org);

      let competition: { id: string; name: string } | null = null;
      if (payment.purpose === 'LICENCE') {
        const name = licenceCompetitionNameById.get(payment.subjectId);
        if (name) competition = { id: payment.subjectId, name };
      } else if (payment.purpose === 'PLAYER_REGISTRATION') {
        competition = competitionByPaymentId.get(payment.id) ?? null;
      }

      if (competition) {
        const entry = byCompetition.get(competition.id) ?? {
          competitionId: competition.id,
          name: competition.name,
          collectedKobo: 0,
        };
        entry.collectedKobo += payment.amountKobo;
        byCompetition.set(competition.id, entry);
      }
    }

    const pendingOrgIds = pendingByOrg.map((row) => row.organisationId);
    const pendingOrgs = pendingOrgIds.length
      ? await this.prisma.organisation.findMany({
          where: { id: { in: pendingOrgIds } },
          select: { id: true, name: true },
        })
      : [];
    const pendingOrgNameById = new Map(pendingOrgs.map((o) => [o.id, o.name]));

    const outstandingByOrganisation = pendingByOrg
      .map((row) => ({
        organisationId: row.organisationId,
        name: pendingOrgNameById.get(row.organisationId) ?? 'Unknown organisation',
        outstandingKobo: row._sum.amountKobo ?? 0,
      }))
      .sort((a, b) => b.outstandingKobo - a.outstandingKobo);

    return {
      totalCollectedKobo,
      totalOutstandingKobo: outstandingByOrganisation.reduce(
        (sum, row) => sum + row.outstandingKobo,
        0,
      ),
      byOrganisation: [...byOrganisation.values()].sort(
        (a, b) => b.collectedKobo - a.collectedKobo,
      ),
      byCompetition: [...byCompetition.values()].sort(
        (a, b) => b.collectedKobo - a.collectedKobo,
      ),
      outstandingByOrganisation,
    };
  }
}
