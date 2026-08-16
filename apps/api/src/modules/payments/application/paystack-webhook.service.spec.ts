import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { PaystackWebhookService } from './paystack-webhook.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PaymentsService } from './payments.service';

const SECRET = 'sk_test_secret';

function signedBody(payload: unknown) {
  const body = Buffer.from(JSON.stringify(payload));
  const signature = createHmac('sha512', SECRET).update(body).digest('hex');
  return { body, signature };
}

describe('PaystackWebhookService', () => {
  let service: PaystackWebhookService;
  let prisma: {
    webhookEvent: { create: jest.Mock; update: jest.Mock };
    payment: { findFirst: jest.Mock };
  };
  let paymentsService: jest.Mocked<PaymentsService>;

  beforeEach(async () => {
    prisma = {
      webhookEvent: {
        create: jest.fn().mockResolvedValue({ id: 'evt-1' }),
        update: jest.fn(),
      },
      payment: { findFirst: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PaystackWebhookService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentsService, useValue: { fulfilPayment: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => SECRET } },
      ],
    }).compile();

    service = moduleRef.get(PaystackWebhookService);
    paymentsService = moduleRef.get(PaymentsService);
  });

  it('stores the raw payload before doing anything else, for every webhook regardless of outcome', async () => {
    const { body, signature } = signedBody({
      event: 'charge.success',
      data: { reference: 'ref-1' },
    });
    prisma.payment.findFirst.mockResolvedValue({ id: 'pay-1' });

    await service.handle(body, signature);

    expect(prisma.webhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rawBody: body.toString('utf8'),
          signatureValid: true,
        }),
      }),
    );
  });

  it('rejects and logs a tampered/invalid signature without fulfilling anything', async () => {
    const { body } = signedBody({
      event: 'charge.success',
      data: { reference: 'ref-1' },
    });

    await service.handle(body, 'not-the-real-signature');

    expect(prisma.webhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ signatureValid: false }),
      }),
    );
    expect(paymentsService.fulfilPayment).not.toHaveBeenCalled();
    expect(prisma.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ processingError: 'Invalid signature' }),
      }),
    );
  });

  it('fulfils the matching payment on a valid charge.success event', async () => {
    const { body, signature } = signedBody({
      event: 'charge.success',
      data: { reference: 'ref-1' },
    });
    prisma.payment.findFirst.mockResolvedValue({ id: 'pay-1' });

    await service.handle(body, signature);

    expect(paymentsService.fulfilPayment).toHaveBeenCalledWith('pay-1');
  });

  it('replaying the same webhook ten times only ever calls fulfilPayment ten times, each idempotent at the PaymentsService layer', async () => {
    const { body, signature } = signedBody({
      event: 'charge.success',
      data: { reference: 'ref-1' },
    });
    prisma.payment.findFirst.mockResolvedValue({ id: 'pay-1' });

    for (let i = 0; i < 10; i += 1) {
      await service.handle(body, signature);
    }

    // The webhook layer calls fulfilPayment every delivery — idempotency
    // that matters (fulfilling exactly once) lives in PaymentsService, unit
    // tested separately; this test documents that the webhook handler
    // itself doesn't need its own dedupe logic because it delegates to
    // something that's already safe to call repeatedly.
    expect(paymentsService.fulfilPayment).toHaveBeenCalledTimes(10);
  });

  it('ignores non-charge.success events without attempting fulfilment', async () => {
    const { body, signature } = signedBody({
      event: 'charge.failed',
      data: { reference: 'ref-1' },
    });

    await service.handle(body, signature);

    expect(paymentsService.fulfilPayment).not.toHaveBeenCalled();
  });

  it('records a processing error when no matching payment is found, rather than throwing', async () => {
    const { body, signature } = signedBody({
      event: 'charge.success',
      data: { reference: 'unknown-ref' },
    });
    prisma.payment.findFirst.mockResolvedValue(null);

    await expect(service.handle(body, signature)).resolves.toBeUndefined();

    expect(prisma.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          processingError: expect.stringContaining('unknown-ref'),
        }),
      }),
    );
  });
});
