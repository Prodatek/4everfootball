import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PaystackClientService } from '../infrastructure/paystack-client.service';
import { PaymentsService } from './payments.service';

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // "run it every 10 minutes" — §3.5
const STALE_AFTER_MS = 30 * 60 * 1000; // "PENDING for more than 30 minutes"

/**
 * §3.5's reconciliation job — the safety net for a browser tab closed
 * mid-payment or a webhook that never arrived. Same @nestjs/schedule
 * @Interval pattern as AutoKickoffService (Phase 1), the one scheduled-job
 * precedent already proven in this codebase, rather than introducing a new
 * queue just for this.
 */
@Injectable()
export class PaymentReconciliationService {
  private readonly logger = new Logger(PaymentReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackClientService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Interval(CHECK_INTERVAL_MS)
  async reconcilePendingPayments(): Promise<void> {
    const stalePending = await this.prisma.payment.findMany({
      where: {
        status: 'PENDING',
        provider: 'PAYSTACK',
        createdAt: { lt: new Date(Date.now() - STALE_AFTER_MS) },
      },
    });

    for (const payment of stalePending) {
      try {
        const result = await this.paystack.verify(payment.reference);

        if (result.status === 'success') {
          await this.paymentsService.fulfilPayment(payment.id);
        } else if (
          result.status === 'failed' ||
          result.status === 'abandoned'
        ) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: result.status === 'failed' ? 'FAILED' : 'ABANDONED',
            },
          });
        }
        // Any other status (still processing, etc.): leave PENDING, the
        // next tick checks again.
      } catch (error) {
        this.logger.error(
          `Reconciliation failed for payment ${payment.id}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }
}
