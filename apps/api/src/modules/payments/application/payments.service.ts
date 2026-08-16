import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { PaymentProvider, PaymentPurpose } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PaystackClientService } from '../infrastructure/paystack-client.service';

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
      }
      // ACADEMY_PLAN / ADD_ON / ONBOARDING: no fulfilment action yet — those
      // features (academy workspace, sponsor add-ons) are the brief's Phase
      // 4/5, out of scope here. The Payment is still correctly marked PAID;
      // there's just nothing downstream to activate for these purposes yet.
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
}
