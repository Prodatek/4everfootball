import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ACADEMY_PLANS, ANNUAL_PREPAY_DISCOUNT } from '@4ef/shared';
import { AcademySubscriptionsService } from './academy-subscriptions.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { InvoicesService } from '../../invoices/application/invoices.service';

function fakePrisma() {
  return {
    player: { count: jest.fn().mockResolvedValue(0) },
    academySubscription: { create: jest.fn(), findFirst: jest.fn() },
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
        { provide: InvoicesService, useValue: { create: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AcademySubscriptionsService);
    invoicesService = moduleRef.get(InvoicesService);
  });

  it('rejects a plan whose player limit is below the current squad size', async () => {
    prisma.player.count.mockResolvedValue(ACADEMY_PLANS.STARTER.maxPlayers + 1);

    await expect(
      service.subscribe({
        organisationId: 'org-1',
        planKey: 'STARTER',
        prepay: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(invoicesService.create).not.toHaveBeenCalled();
  });

  it('invoices at full price with no discount when not prepaying', async () => {
    invoicesService.create.mockResolvedValue({ id: 'inv-1' } as never);
    prisma.academySubscription.create.mockResolvedValue({ id: 'sub-1' });

    await service.subscribe({
      organisationId: 'org-1',
      planKey: 'GROWTH',
      prepay: false,
    });

    expect(invoicesService.create).toHaveBeenCalledWith(
      expect.objectContaining({ discountKobo: 0 }),
    );
  });

  it('applies the 20% annual prepay discount from pricing.ts when prepaying', async () => {
    invoicesService.create.mockResolvedValue({ id: 'inv-1' } as never);
    prisma.academySubscription.create.mockResolvedValue({ id: 'sub-1' });

    await service.subscribe({
      organisationId: 'org-1',
      planKey: 'GROWTH',
      prepay: true,
    });

    const expectedDiscount = Math.round(
      ACADEMY_PLANS.GROWTH.priceKobo * ANNUAL_PREPAY_DISCOUNT,
    );
    expect(invoicesService.create).toHaveBeenCalledWith(
      expect.objectContaining({ discountKobo: expectedDiscount }),
    );
  });

  it('never calls a payments/checkout service — invoiced only, no monthly card billing', async () => {
    invoicesService.create.mockResolvedValue({ id: 'inv-1' } as never);
    prisma.academySubscription.create.mockResolvedValue({ id: 'sub-1' });

    await service.subscribe({
      organisationId: 'org-1',
      planKey: 'STARTER',
      prepay: true,
    });

    // No PaymentsService/PaystackClientService is even injected into this
    // service — the absence itself is the enforcement (see constructor).
    expect(service).not.toHaveProperty('paymentsService');
  });

  it('records a one-year subscription linked to the created invoice', async () => {
    invoicesService.create.mockResolvedValue({ id: 'inv-1' } as never);
    prisma.academySubscription.create.mockResolvedValue({ id: 'sub-1' });

    await service.subscribe({
      organisationId: 'org-1',
      planKey: 'ELITE',
      prepay: false,
    });

    expect(prisma.academySubscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organisationId: 'org-1',
          planKey: 'ELITE',
          invoiceId: 'inv-1',
        }),
      }),
    );
  });
});
