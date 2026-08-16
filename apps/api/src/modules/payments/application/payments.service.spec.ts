import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PaystackClientService } from '../infrastructure/paystack-client.service';

function fakePrisma() {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue(undefined),
    payment: { findUnique: jest.fn(), update: jest.fn() },
    playerRegistration: { updateMany: jest.fn() },
    competition: { update: jest.fn() },
  };
  return {
    payment: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback: (t: typeof tx) => unknown) =>
      callback(tx),
    ),
    __tx: tx,
  };
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: ReturnType<typeof fakePrisma>;
  let paystack: jest.Mocked<PaystackClientService>;

  beforeEach(async () => {
    prisma = fakePrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: PaystackClientService,
          useValue: { initialize: jest.fn(), verify: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(PaymentsService);
    paystack = moduleRef.get(PaystackClientService);
  });

  describe('initialize', () => {
    it('rejects a non-positive amount', async () => {
      await expect(
        service.initialize({
          organisationId: 'org-1',
          provider: 'PAYSTACK',
          purpose: 'LICENCE',
          subjectType: 'COMPETITION',
          subjectId: 'comp-1',
          amountKobo: 0,
          payerEmail: 'a@example.com',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('creates a PENDING payment with our own reference before calling Paystack', async () => {
      prisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        reference: '4EF-abc',
      });
      paystack.initialize.mockResolvedValue({
        authorizationUrl: 'https://paystack.test/pay/abc',
        accessCode: 'code',
        reference: '4EF-abc',
      });

      await service.initialize({
        organisationId: 'org-1',
        provider: 'PAYSTACK',
        purpose: 'LICENCE',
        subjectType: 'COMPETITION',
        subjectId: 'comp-1',
        amountKobo: 7_500_000,
        payerEmail: 'a@example.com',
      });

      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING',
            amountKobo: 7_500_000,
          }),
        }),
      );
      const createOrder = prisma.payment.create.mock.invocationCallOrder[0];
      const initializeOrder = paystack.initialize.mock.invocationCallOrder[0];
      expect(createOrder).toBeLessThan(initializeOrder);
    });

    it('skips the Paystack call entirely for BANK_TRANSFER', async () => {
      prisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        reference: '4EF-abc',
      });

      const result = await service.initialize({
        organisationId: 'org-1',
        provider: 'BANK_TRANSFER',
        purpose: 'LICENCE',
        subjectType: 'COMPETITION',
        subjectId: 'comp-1',
        amountKobo: 7_500_000,
        payerEmail: 'a@example.com',
      });

      expect(paystack.initialize).not.toHaveBeenCalled();
      expect(result.authorizationUrl).toBeNull();
    });
  });

  describe('fulfilPayment', () => {
    it('is a no-op for a payment already PAID (idempotency)', async () => {
      prisma.__tx.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        status: 'PAID',
      });

      await service.fulfilPayment('pay-1');

      expect(prisma.__tx.payment.update).not.toHaveBeenCalled();
    });

    it('replaying fulfilPayment ten times only ever fulfils once', async () => {
      let paid = false;
      prisma.__tx.payment.findUnique.mockImplementation(() =>
        paid
          ? {
              id: 'pay-1',
              status: 'PAID',
              purpose: 'LICENCE',
              subjectId: 'comp-1',
            }
          : {
              id: 'pay-1',
              status: 'PENDING',
              purpose: 'LICENCE',
              subjectId: 'comp-1',
            },
      );
      prisma.__tx.payment.update.mockImplementation(() => {
        paid = true;
      });

      for (let i = 0; i < 10; i += 1) {
        await service.fulfilPayment('pay-1');
      }

      expect(prisma.__tx.payment.update).toHaveBeenCalledTimes(1);
      expect(prisma.__tx.competition.update).toHaveBeenCalledTimes(1);
    });

    it('confirms only PENDING_PAYMENT/DRAFT registrations tied to this payment for PLAYER_REGISTRATION purpose', async () => {
      prisma.__tx.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        status: 'PENDING',
        purpose: 'PLAYER_REGISTRATION',
      });

      await service.fulfilPayment('pay-1');

      expect(prisma.__tx.playerRegistration.updateMany).toHaveBeenCalledWith({
        where: {
          paymentId: 'pay-1',
          status: { in: ['PENDING_PAYMENT', 'DRAFT'] },
        },
        data: { status: 'CONFIRMED' },
      });
    });

    it('licenses the competition for LICENCE purpose', async () => {
      prisma.__tx.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        status: 'PENDING',
        purpose: 'LICENCE',
        subjectId: 'comp-1',
      });

      await service.fulfilPayment('pay-1');

      expect(prisma.__tx.competition.update).toHaveBeenCalledWith({
        where: { id: 'comp-1' },
        data: { licenceStatus: 'LICENSED' },
      });
    });
  });

  describe('confirmBankTransfer', () => {
    it('rejects confirming a PAYSTACK payment through the transfer path', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        provider: 'PAYSTACK',
      });

      await expect(
        service.confirmBankTransfer('pay-1', 'admin-1', {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects confirming a payment that does not exist', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.confirmBankTransfer('missing', 'admin-1', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('records who confirmed it, then runs the same fulfilPayment path a webhook would', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        provider: 'BANK_TRANSFER',
      });
      prisma.__tx.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        status: 'PENDING',
        purpose: 'LICENCE',
        subjectId: 'comp-1',
      });

      await service.confirmBankTransfer('pay-1', 'admin-1', {
        providerReference: 'TRF-123',
        transferNote: 'Paid at branch',
      });

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: expect.objectContaining({
          confirmedById: 'admin-1',
          providerReference: 'TRF-123',
          transferNote: 'Paid at branch',
        }),
      });
      expect(prisma.__tx.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PAID' }),
        }),
      );
    });
  });
});
