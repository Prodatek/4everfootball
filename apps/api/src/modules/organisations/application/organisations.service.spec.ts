import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { OrganisationsService } from './organisations.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

function fakePrisma() {
  return {
    organisation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    organisationMember: { findUnique: jest.fn(), upsert: jest.fn() },
    competition: { count: jest.fn(), findUniqueOrThrow: jest.fn() },
    competitionEntry: { count: jest.fn() },
  };
}

describe('OrganisationsService', () => {
  let service: OrganisationsService;
  let prisma: ReturnType<typeof fakePrisma>;

  beforeEach(async () => {
    prisma = fakePrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrganisationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(OrganisationsService);
  });

  describe('assertCanManage', () => {
    it('allows a SUPER_ADMIN regardless of membership', async () => {
      await expect(
        service.assertCanManage('org-1', {
          sub: 'user-1',
          roles: ['SUPER_ADMIN'],
        } as never),
      ).resolves.toBeUndefined();
      expect(prisma.organisationMember.findUnique).not.toHaveBeenCalled();
    });

    it('allows an OWNER member', async () => {
      prisma.organisationMember.findUnique.mockResolvedValue({ role: 'OWNER' });
      await expect(
        service.assertCanManage('org-1', {
          sub: 'user-1',
          roles: ['USER'],
        } as never),
      ).resolves.toBeUndefined();
    });

    it('allows an ADMIN member', async () => {
      prisma.organisationMember.findUnique.mockResolvedValue({ role: 'ADMIN' });
      await expect(
        service.assertCanManage('org-1', {
          sub: 'user-1',
          roles: ['USER'],
        } as never),
      ).resolves.toBeUndefined();
    });

    it('rejects a VIEWER member', async () => {
      prisma.organisationMember.findUnique.mockResolvedValue({
        role: 'VIEWER',
      });
      await expect(
        service.assertCanManage('org-1', {
          sub: 'user-1',
          roles: ['USER'],
        } as never),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a non-member entirely', async () => {
      prisma.organisationMember.findUnique.mockResolvedValue(null);
      await expect(
        service.assertCanManage('org-1', {
          sub: 'user-1',
          roles: ['USER'],
        } as never),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('assertCanCoach', () => {
    it('allows a SUPER_ADMIN regardless of membership', async () => {
      await expect(
        service.assertCanCoach('org-1', {
          sub: 'user-1',
          roles: ['SUPER_ADMIN'],
        } as never),
      ).resolves.toBeUndefined();
      expect(prisma.organisationMember.findUnique).not.toHaveBeenCalled();
    });

    it('allows a COACH member (the whole point of the role)', async () => {
      prisma.organisationMember.findUnique.mockResolvedValue({ role: 'COACH' });
      await expect(
        service.assertCanCoach('org-1', {
          sub: 'user-1',
          roles: ['USER'],
        } as never),
      ).resolves.toBeUndefined();
    });

    it('still allows an OWNER/ADMIN (they might coach too)', async () => {
      prisma.organisationMember.findUnique.mockResolvedValue({ role: 'OWNER' });
      await expect(
        service.assertCanCoach('org-1', {
          sub: 'user-1',
          roles: ['USER'],
        } as never),
      ).resolves.toBeUndefined();
    });

    it('rejects a VIEWER member', async () => {
      prisma.organisationMember.findUnique.mockResolvedValue({
        role: 'VIEWER',
      });
      await expect(
        service.assertCanCoach('org-1', {
          sub: 'user-1',
          roles: ['USER'],
        } as never),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('checkCanCreateCommunityCompetition', () => {
    it('allows the first COMMUNITY competition for an organisation', async () => {
      prisma.competition.count.mockResolvedValue(0);
      await expect(
        service.checkCanCreateCommunityCompetition('org-1'),
      ).resolves.toBe(true);
    });

    it('blocks a second concurrent COMMUNITY competition', async () => {
      prisma.competition.count.mockResolvedValue(1);
      await expect(
        service.checkCanCreateCommunityCompetition('org-1'),
      ).resolves.toBe(false);
    });

    it('excludes CLOSED competitions from the open count', async () => {
      await service.checkCanCreateCommunityCompetition('org-1');
      expect(prisma.competition.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            licenceStatus: { notIn: ['CLOSED'] },
          }),
        }),
      );
    });
  });

  describe('checkTeamLimitFor', () => {
    it('flags needsUpgrade once a COMMUNITY-tier competition is at its team cap', async () => {
      prisma.competition.findUniqueOrThrow.mockResolvedValue({
        tier: 'COMMUNITY',
        maxTeams: null,
      });
      prisma.competitionEntry.count.mockResolvedValue(8);

      const result = await service.checkTeamLimitFor('comp-1');
      expect(result).toEqual({ withinLimit: false, needsUpgrade: true });
    });

    it('is unlimited for a FEDERATION-tier competition with no maxTeams', async () => {
      prisma.competition.findUniqueOrThrow.mockResolvedValue({
        tier: 'FEDERATION',
        maxTeams: null,
      });
      prisma.competitionEntry.count.mockResolvedValue(500);

      const result = await service.checkTeamLimitFor('comp-1');
      expect(result).toEqual({ withinLimit: true, needsUpgrade: false });
    });
  });
});
