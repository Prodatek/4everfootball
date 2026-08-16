import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ADD_ONS } from '@4ef/shared';
import { MediaPacksService } from './media-packs.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PaymentsService } from '../../payments/application/payments.service';

function fakePrisma() {
  return {
    mediaPackEntitlement: { findFirst: jest.fn() },
    competition: { findUnique: jest.fn() },
  };
}

describe('MediaPacksService', () => {
  let service: MediaPacksService;
  let prisma: ReturnType<typeof fakePrisma>;
  let paymentsService: jest.Mocked<PaymentsService>;

  beforeEach(async () => {
    prisma = fakePrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        MediaPacksService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentsService, useValue: { initialize: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(MediaPacksService);
    paymentsService = moduleRef.get(PaymentsService);
  });

  describe('hasEntitlement', () => {
    it('is true when a whole-club (competitionId null) entitlement exists', async () => {
      prisma.mediaPackEntitlement.findFirst.mockResolvedValue({ id: 'e1' });
      await expect(service.hasEntitlement('org-1', 'comp-1')).resolves.toBe(
        true,
      );
      expect(prisma.mediaPackEntitlement.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organisationId: 'org-1',
            OR: [{ competitionId: null }, { competitionId: 'comp-1' }],
          },
        }),
      );
    });

    it('is false when no entitlement row matches', async () => {
      prisma.mediaPackEntitlement.findFirst.mockResolvedValue(null);
      await expect(service.hasEntitlement('org-1', 'comp-1')).resolves.toBe(
        false,
      );
    });

    it('checks only the whole-club condition when no competitionId is given', async () => {
      prisma.mediaPackEntitlement.findFirst.mockResolvedValue(null);
      await service.hasEntitlement('org-1', null);
      expect(prisma.mediaPackEntitlement.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organisationId: 'org-1', OR: [{ competitionId: null }] },
        }),
      );
    });
  });

  describe('purchase', () => {
    it('prices a whole-club pack from ADD_ONS.MEDIA_PACK_PER_CLUB and tags the organisation subject type', async () => {
      paymentsService.initialize.mockResolvedValue({
        payment: {} as never,
        authorizationUrl: null,
      });

      await service.purchase({
        organisationId: 'org-1',
        provider: 'PAYSTACK',
        payerEmail: 'a@b.com',
      });

      expect(paymentsService.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          amountKobo: ADD_ONS.MEDIA_PACK_PER_CLUB.priceKobo,
          subjectType: 'MEDIA_PACK_ORGANISATION',
          subjectId: 'org-1',
          purpose: 'ADD_ON',
        }),
      );
    });

    it('prices a competition-scoped pack from ADD_ONS.MEDIA_PACK_COMPETITION and tags the competition subject type', async () => {
      prisma.competition.findUnique.mockResolvedValue({
        organisationId: 'org-1',
      });
      paymentsService.initialize.mockResolvedValue({
        payment: {} as never,
        authorizationUrl: null,
      });

      await service.purchase({
        organisationId: 'org-1',
        competitionId: 'comp-1',
        provider: 'PAYSTACK',
        payerEmail: 'a@b.com',
      });

      expect(paymentsService.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          amountKobo: ADD_ONS.MEDIA_PACK_COMPETITION.priceKobo,
          subjectType: 'MEDIA_PACK_COMPETITION',
          subjectId: 'comp-1',
        }),
      );
    });

    it('rejects a competition that does not belong to the given organisation', async () => {
      prisma.competition.findUnique.mockResolvedValue({
        organisationId: 'other-org',
      });

      await expect(
        service.purchase({
          organisationId: 'org-1',
          competitionId: 'comp-1',
          provider: 'PAYSTACK',
          payerEmail: 'a@b.com',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(paymentsService.initialize).not.toHaveBeenCalled();
    });
  });
});
