import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ACADEMY_PLANS, ANNUAL_PREPAY_DISCOUNT } from '@4ef/shared';
import { AcademySubscriptionsService } from './academy-subscriptions.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { InvoicesService } from '../../invoices/application/invoices.service';

function fakePrisma() {
  return {
    player: { count: jest.fn().mockResolvedValue(0) },
    academySubscription: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    academySubscriptionRequest: {
      create: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('AcademySubscriptionsService', () => {
  let service: AcademySubscriptionsService;
  let prisma: ReturnType<typeof fakePrisma>;
  let invoicesService: jest.Mocked<InvoicesService>;

  beforeEach(async () => {
    prisma = fakePrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AcademySubscriptionsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: InvoicesService,
          useValue: { create: jest.fn(), issue: jest.fn(), recordPayment: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(AcademySubscriptionsService);
    invoicesService = moduleRef.get(InvoicesService);
  });

  describe('subscribe', () => {
    it('rejects a plan whose player limit is below the current squad size', async () => {
      prisma.player.count.mockResolvedValue(ACADEMY_PLANS.STARTER.maxPlayers + 1);

      await expect(
        service.subscribe({ organisationId: 'org-1', planKey: 'STARTER', prepay: false }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(invoicesService.create).not.toHaveBeenCalled();
    });

    it('rejects a second request while one is already awaiting confirmation', async () => {
      prisma.academySubscriptionRequest.findFirst.mockResolvedValue({ id: 'existing-request' });

      await expect(
        service.subscribe({ organisationId: 'org-1', planKey: 'GROWTH', prepay: false }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(invoicesService.create).not.toHaveBeenCalled();
    });

    it('invoices at full price with no discount when not prepaying', async () => {
      invoicesService.create.mockResolvedValue({ id: 'inv-1' } as never);
      prisma.academySubscriptionRequest.create.mockResolvedValue({ id: 'req-1' });

      await service.subscribe({ organisationId: 'org-1', planKey: 'GROWTH', prepay: false });

      expect(invoicesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ discountKobo: 0 }),
      );
    });

    it('applies the 20% annual prepay discount from pricing.ts when prepaying', async () => {
      invoicesService.create.mockResolvedValue({ id: 'inv-1' } as never);
      prisma.academySubscriptionRequest.create.mockResolvedValue({ id: 'req-1' });

      await service.subscribe({ organisationId: 'org-1', planKey: 'GROWTH', prepay: true });

      const expectedDiscount = Math.round(ACADEMY_PLANS.GROWTH.priceKobo * ANNUAL_PREPAY_DISCOUNT);
      expect(invoicesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ discountKobo: expectedDiscount }),
      );
    });

    it('issues the invoice (awaiting payment, not a perpetual draft) and creates a request, never the subscription itself', async () => {
      invoicesService.create.mockResolvedValue({ id: 'inv-1' } as never);
      prisma.academySubscriptionRequest.create.mockResolvedValue({ id: 'req-1' });

      await service.subscribe({ organisationId: 'org-1', planKey: 'ELITE', prepay: false });

      expect(invoicesService.issue).toHaveBeenCalledWith('inv-1');
      expect(prisma.academySubscriptionRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organisationId: 'org-1',
            planKey: 'ELITE',
            prepay: false,
            invoiceId: 'inv-1',
          }),
        }),
      );
      expect(prisma.academySubscription.create).not.toHaveBeenCalled();
    });

    it('never calls a payments/checkout service — invoiced only, no monthly card billing', async () => {
      invoicesService.create.mockResolvedValue({ id: 'inv-1' } as never);
      prisma.academySubscriptionRequest.create.mockResolvedValue({ id: 'req-1' });

      await service.subscribe({ organisationId: 'org-1', planKey: 'STARTER', prepay: true });

      expect(service).not.toHaveProperty('paymentsService');
    });
  });

  describe('confirmAndActivate', () => {
    it('throws NotFoundException for a missing request', async () => {
      prisma.academySubscriptionRequest.findUnique.mockResolvedValue(null);

      await expect(service.confirmAndActivate('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects a request that was already activated', async () => {
      prisma.academySubscriptionRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        activatedAt: new Date(),
        invoice: { status: 'PAID', totalKobo: 100_000 },
      });

      await expect(service.confirmAndActivate('req-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('records the full invoice amount as paid, then creates the subscription and stamps activatedAt', async () => {
      prisma.academySubscriptionRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        organisationId: 'org-1',
        planKey: 'GROWTH',
        invoiceId: 'inv-1',
        activatedAt: null,
        invoice: { status: 'SENT', totalKobo: 9_600_000 },
      });
      prisma.academySubscription.create.mockResolvedValue({ id: 'sub-1' });

      await service.confirmAndActivate('req-1');

      expect(invoicesService.recordPayment).toHaveBeenCalledWith('inv-1', 9_600_000);
      expect(prisma.academySubscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ organisationId: 'org-1', planKey: 'GROWTH', invoiceId: 'inv-1' }),
        }),
      );
      expect(prisma.academySubscriptionRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        data: { activatedAt: expect.any(Date) },
      });
    });

    it('skips recordPayment when the invoice is already PAID (e.g. paid manually elsewhere)', async () => {
      prisma.academySubscriptionRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        organisationId: 'org-1',
        planKey: 'STARTER',
        invoiceId: 'inv-1',
        activatedAt: null,
        invoice: { status: 'PAID', totalKobo: 4_500_000 },
      });
      prisma.academySubscription.create.mockResolvedValue({ id: 'sub-1' });

      await service.confirmAndActivate('req-1');

      expect(invoicesService.recordPayment).not.toHaveBeenCalled();
      expect(prisma.academySubscription.create).toHaveBeenCalled();
    });
  });
});
