import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ImpactReportService } from './impact-report.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { S3StorageService } from '../../media/infrastructure/s3-storage.service';
import { PdfRendererService } from '../../pdf/pdf-renderer.service';
import { SponsorDashboardService } from './sponsor-dashboard.service';

function fakePrisma() {
  return {
    competition: { findUnique: jest.fn() },
    competitionEntry: { findMany: jest.fn().mockResolvedValue([]) },
    playerRegistration: { findMany: jest.fn().mockResolvedValue([]) },
    graphic: { count: jest.fn().mockResolvedValue(0) },
    playerOutcome: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

const FAKE_DASHBOARD = {
  competitionName: 'Lagos Cup',
  teamsRegistered: 24,
  playersRegistered: 412,
  matchesPlayed: 60,
  matchesVerified: 58,
  communitiesCovered: 9,
  totalMinutes: 5220,
  pageViews: 3104,
  graphicsShared: 87,
};

describe('ImpactReportService', () => {
  let service: ImpactReportService;
  let prisma: ReturnType<typeof fakePrisma>;
  let dashboardService: jest.Mocked<SponsorDashboardService>;
  let s3: jest.Mocked<S3StorageService>;

  beforeEach(async () => {
    prisma = fakePrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ImpactReportService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: SponsorDashboardService,
          useValue: { getForSlug: jest.fn().mockResolvedValue(FAKE_DASHBOARD) },
        },
        {
          provide: PdfRendererService,
          useValue: { render: jest.fn().mockResolvedValue(Buffer.from('pdf')) },
        },
        {
          provide: S3StorageService,
          useValue: { putObject: jest.fn(), publicUrlFor: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(ImpactReportService);
    dashboardService = moduleRef.get(SponsorDashboardService);
    s3 = moduleRef.get(S3StorageService);
  });

  describe('generateDataset', () => {
    it('throws NotFoundException for a missing competition', async () => {
      prisma.competition.findUnique.mockResolvedValue(null);
      await expect(service.generateDataset('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('groups registered players by age bucket and gender', async () => {
      prisma.competition.findUnique.mockResolvedValue({
        id: 'comp-1',
        name: 'Lagos Cup',
        season: '2026',
        slug: 'lagos-cup',
      });
      prisma.playerRegistration.findMany.mockResolvedValue([
        { player: { dateOfBirth: new Date('2015-01-01'), gender: 'MALE' } },
        { player: { dateOfBirth: new Date('2014-06-01'), gender: 'MALE' } },
        { player: { dateOfBirth: new Date('2005-01-01'), gender: 'FEMALE' } },
      ]);

      const dataset = await service.generateDataset('comp-1');

      const under13Male = dataset.playersByAgeGroupAndGender.find(
        (r) => r.ageGroup === 'Under 13' && r.gender === 'MALE',
      );
      expect(under13Male?.count).toBe(2);
      const adultFemale = dataset.playersByAgeGroupAndGender.find(
        (r) => r.ageGroup === '19+' && r.gender === 'FEMALE',
      );
      expect(adultFemale?.count).toBe(1);
    });

    it('maps team entries to teams and communities', async () => {
      prisma.competition.findUnique.mockResolvedValue({
        id: 'comp-1',
        name: 'Lagos Cup',
        season: '2026',
        slug: 'lagos-cup',
      });
      prisma.competitionEntry.findMany.mockResolvedValue([
        { team: { name: 'Ikorodu FC', community: 'Ikorodu' } },
        { team: { name: 'Yaba United', community: null } },
      ]);

      const dataset = await service.generateDataset('comp-1');

      expect(dataset.teamsAndCommunities).toEqual([
        { teamName: 'Ikorodu FC', community: 'Ikorodu' },
        { teamName: 'Yaba United', community: null },
      ]);
    });

    it('includes player outcomes joined with the player name', async () => {
      prisma.competition.findUnique.mockResolvedValue({
        id: 'comp-1',
        name: 'Lagos Cup',
        season: '2026',
        slug: 'lagos-cup',
      });
      prisma.playerOutcome.findMany.mockResolvedValue([
        {
          player: { firstName: 'Chuka', lastName: 'Obi' },
          type: 'SIGNING',
          description: 'Signed for X FC',
          sourceNote: 'Club statement',
          occurredAt: new Date('2026-08-01'),
        },
      ]);

      const dataset = await service.generateDataset('comp-1');

      expect(dataset.playerOutcomes).toEqual([
        {
          playerName: 'Chuka Obi',
          type: 'SIGNING',
          description: 'Signed for X FC',
          sourceNote: 'Club statement',
          occurredAt: new Date('2026-08-01').toISOString(),
        },
      ]);
    });

    it('pulls reach numbers straight from SponsorDashboardService, not a re-derivation', async () => {
      prisma.competition.findUnique.mockResolvedValue({
        id: 'comp-1',
        name: 'Lagos Cup',
        season: '2026',
        slug: 'lagos-cup',
      });

      const dataset = await service.generateDataset('comp-1');

      expect(dashboardService.getForSlug).toHaveBeenCalledWith('lagos-cup');
      expect(dataset.reach.teamsRegistered).toBe(24);
      expect(dataset.reach.matchesVerified).toBe(58);
    });
  });

  describe('toCsv', () => {
    it('includes every section header', () => {
      const csv = service.toCsv({
        competitionName: 'Lagos Cup',
        season: '2026',
        generatedAt: new Date().toISOString(),
        reach: {
          teamsRegistered: 1,
          playersRegistered: 1,
          matchesPlayed: 1,
          matchesVerified: 1,
          communitiesCovered: 1,
          totalMinutes: 1,
          pageViews: 1,
          graphicsShared: 1,
          brandedGraphicsDelivered: 1,
        },
        teamsAndCommunities: [],
        playersByAgeGroupAndGender: [],
        playerOutcomes: [],
      });

      expect(csv).toContain('REACH');
      expect(csv).toContain('TEAMS AND COMMUNITIES');
      expect(csv).toContain('PLAYERS BY AGE GROUP AND GENDER');
      expect(csv).toContain('PLAYER OUTCOMES');
    });
  });

  describe('generateAndUploadPdf', () => {
    it('uploads the rendered PDF to S3 and returns the dataset plus public URL', async () => {
      prisma.competition.findUnique.mockResolvedValue({
        id: 'comp-1',
        name: 'Lagos Cup',
        season: '2026',
        slug: 'lagos-cup',
      });
      s3.publicUrlFor.mockReturnValue(
        'https://cdn.example.com/impact-reports/comp-1/x.pdf',
      );

      const result = await service.generateAndUploadPdf('comp-1');

      expect(s3.putObject).toHaveBeenCalledWith(
        expect.stringMatching(/^impact-reports\/comp-1\//),
        expect.any(Buffer),
        'application/pdf',
      );
      expect(result.url).toBe(
        'https://cdn.example.com/impact-reports/comp-1/x.pdf',
      );
      expect(result.dataset.competitionName).toBe('Lagos Cup');
    });
  });
});
