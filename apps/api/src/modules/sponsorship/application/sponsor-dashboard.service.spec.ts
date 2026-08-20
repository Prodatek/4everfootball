import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SponsorDashboardService } from './sponsor-dashboard.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

function fakePrisma() {
  return {
    competition: { findUnique: jest.fn() },
    competitionEntry: { count: jest.fn().mockResolvedValue(0) },
    playerRegistration: { count: jest.fn().mockResolvedValue(0) },
    fixture: { count: jest.fn().mockResolvedValue(0) },
    team: { findMany: jest.fn().mockResolvedValue([]) },
    matchEvent: {
      aggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { minute: null, stoppageMinute: null } }),
    },
    graphic: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { shareCount: null } }),
    },
  };
}

describe('SponsorDashboardService', () => {
  let service: SponsorDashboardService;
  let prisma: ReturnType<typeof fakePrisma>;

  beforeEach(async () => {
    prisma = fakePrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SponsorDashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(SponsorDashboardService);
  });

  it('throws NotFoundException for a missing competition slug', async () => {
    prisma.competition.findUnique.mockResolvedValue(null);
    await expect(service.getForSlug('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('derives every metric from existing tables, never a hand-entered figure', async () => {
    prisma.competition.findUnique.mockResolvedValue({
      id: 'comp-1',
      name: 'Lagos Cup',
      pageViewCount: 3104,
      logoUrl: 'https://example.com/logo.png',
      sponsorLogoUrl: 'https://example.com/sponsor.png',
      primaryColor: '#a238ff',
      secondaryColor: '#0d0812',
    });
    prisma.competitionEntry.count.mockResolvedValue(24);
    prisma.playerRegistration.count.mockResolvedValue(412);
    prisma.fixture.count.mockResolvedValueOnce(60).mockResolvedValueOnce(58);
    prisma.team.findMany.mockResolvedValue([
      { community: 'Ikorodu' },
      { community: 'Yaba' },
    ]);
    prisma.matchEvent.aggregate.mockResolvedValue({
      _sum: { minute: 5200, stoppageMinute: 20 },
    });
    prisma.graphic.aggregate.mockResolvedValue({ _sum: { shareCount: 87 } });

    const result = await service.getForSlug('lagos-cup');

    expect(result).toEqual({
      competitionName: 'Lagos Cup',
      competitionLogoUrl: 'https://example.com/logo.png',
      sponsorLogoUrl: 'https://example.com/sponsor.png',
      primaryColor: '#a238ff',
      secondaryColor: '#0d0812',
      teamsRegistered: 24,
      playersRegistered: 412,
      matchesPlayed: 60,
      matchesVerified: 58,
      communitiesCovered: 2,
      totalMinutes: 5220,
      pageViews: 3104,
      graphicsShared: 87,
    });
  });

  it('only counts CONFIRMED/LOCKED registrations as "players registered"', async () => {
    prisma.competition.findUnique.mockResolvedValue({
      id: 'comp-1',
      name: 'X',
      pageViewCount: 0,
    });

    await service.getForSlug('x');

    expect(prisma.playerRegistration.count).toHaveBeenCalledWith({
      where: {
        competitionId: 'comp-1',
        status: { in: ['CONFIRMED', 'LOCKED'] },
      },
    });
  });

  it('defaults minutes and shares to zero when the aggregates are null (no data yet)', async () => {
    prisma.competition.findUnique.mockResolvedValue({
      id: 'comp-1',
      name: 'X',
      pageViewCount: 0,
    });

    const result = await service.getForSlug('x');

    expect(result.totalMinutes).toBe(0);
    expect(result.graphicsShared).toBe(0);
  });
});
