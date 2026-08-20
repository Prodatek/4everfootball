import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { paginate } from '../../../common/dto/paginated-result';
import { verifyPaystackSignature } from '../domain/paystack-signature';
import { PaymentsService } from './payments.service';

interface PaystackWebhookPayload {
  event: string;
  data: { reference: string; status: string };
}

@Injectable()
export class PaystackWebhookService {
  private readonly logger = new Logger(PaystackWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * §3.5, in full: verify signature over the RAW body -> store the raw
   * payload BEFORE doing anything else ("when something goes wrong at 9pm
   * on a matchday you will need it") -> respond fast, process idempotently
   * keyed on the reference. The controller responds 200 immediately after
   * this resolves; this method itself is what has to stay fast and safe to
   * retry, not the HTTP round trip.
   */
  async handle(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): Promise<void> {
    const secretKey = this.config.get<string>('PAYSTACK_SECRET_KEY');
    const signatureValid = secretKey
      ? verifyPaystackSignature(rawBody, signatureHeader, secretKey)
      : false;

    let payload: PaystackWebhookPayload | null = null;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as PaystackWebhookPayload;
    } catch {
      payload = null;
    }

    // Stored before any processing, signature-valid or not — a rejected
    // webhook is exactly the kind of thing you need the raw payload for
    // later.
    const webhookEvent = await this.prisma.webhookEvent.create({
      data: {
        provider: 'PAYSTACK',
        eventType: payload?.event ?? 'unknown',
        providerReference: payload?.data?.reference,
        signatureValid,
        rawBody: rawBody.toString('utf8'),
      },
    });

    if (!signatureValid) {
      this.logger.warn(
        `Rejected Paystack webhook with invalid signature (event ${webhookEvent.id})`,
      );
      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processingError: 'Invalid signature', processedAt: new Date() },
      });
      return;
    }

    if (!payload || payload.event !== 'charge.success') {
      // Other event types (charge.failed, etc.) are stored but not
      // fulfilled — only a successful charge triggers fulfilment.
      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processedAt: new Date() },
      });
      return;
    }

    try {
      const payment = await this.prisma.payment.findFirst({
        where: {
          OR: [
            { reference: payload.data.reference },
            { providerReference: payload.data.reference },
          ],
        },
      });

      if (!payment) {
        throw new Error(
          `No payment found for reference ${payload.data.reference}`,
        );
      }

      await this.paymentsService.fulfilPayment(payment.id);

      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processedAt: new Date() },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to process Paystack webhook ${webhookEvent.id}: ${message}`,
      );
      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processingError: message, processedAt: new Date() },
      });
    }
  }

  // §5 D2: "Webhook log with signature-validity status" — internal-only
  // read of the raw log every webhook write already appends to above.
  async listRecent(page: number, limit: number) {
    const [items, total] = await Promise.all([
      this.prisma.webhookEvent.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.webhookEvent.count(),
    ]);

    return paginate(items, total, page, limit);
  }
}
