import { Test } from '@nestjs/testing';
import { SponsorEntitlementsService } from './sponsor-entitlements.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

function fakePrisma() {
  return {
    sponsorEntitlement: { create: jest.fn(), findFirst: jest.fn() },
  };
}

describe('SponsorEntitlementsService', () => {
  let service: SponsorEntitlementsService;
  let prisma: ReturnType<typeof fakePrisma>;

  beforeEach(async () => {
    prisma = fakePrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SponsorEntitlementsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(SponsorEntitlementsService);
  });

  it('grant() creates a row with no payment reference (admin-granted, not purchased)', async () => {
    prisma.sponsorEntitlement.create.mockResolvedValue({ id: 'e1' });

    await service.grant({
      organisationId: 'org-1',
      feature: 'IMPACT_REPORT',
      grantedById: 'user-1',
      note: 'Closed with MTN, invoice #4521',
    });

    expect(prisma.sponsorEntitlement.create).toHaveBeenCalledWith({
      data: {
        organisationId: 'org-1',
        feature: 'IMPACT_REPORT',
        grantedById: 'user-1',
        note: 'Closed with MTN, invoice #4521',
      },
    });
  });

  describe('hasEntitlement', () => {
    it('is true when a whole-org grant exists (competitionId null)', async () => {
      prisma.sponsorEntitlement.findFirst.mockResolvedValue({ id: 'e1' });
      await expect(
        service.hasEntitlement('org-1', 'comp-1', 'IMPACT_REPORT'),
      ).resolves.toBe(true);
    });

    it('is false when nothing matches', async () => {
      prisma.sponsorEntitlement.findFirst.mockResolvedValue(null);
      await expect(
        service.hasEntitlement('org-1', 'comp-1', 'IMPACT_REPORT'),
      ).resolves.toBe(false);
    });
  });
});
