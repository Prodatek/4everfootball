import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { S3StorageService } from '../../media/infrastructure/s3-storage.service';
import { PdfRendererService } from '../../pdf/pdf-renderer.service';
import { SponsorDashboardService } from './sponsor-dashboard.service';
import { ageBucket } from '../domain/age-bucket';
import { toCsvTable } from '../domain/csv';

export interface ImpactReportDataset {
  competitionName: string;
  season: string;
  generatedAt: string;
  reach: {
    teamsRegistered: number;
    playersRegistered: number;
    matchesPlayed: number;
    matchesVerified: number;
    communitiesCovered: number;
    totalMinutes: number;
    pageViews: number;
    graphicsShared: number;
    brandedGraphicsDelivered: number;
  };
  teamsAndCommunities: Array<{ teamName: string; community: string | null }>;
  playersByAgeGroupAndGender: Array<{
    ageGroup: string;
    gender: string;
    count: number;
  }>;
  playerOutcomes: Array<{
    playerName: string;
    type: string;
    description: string;
    sourceNote: string;
    occurredAt: string;
  }>;
}

/**
 * Sections match the brief's own list (§5.1): "teams and communities,
 * players by age group and gender, matches played and verified, minutes
 * delivered, digital reach, branding delivery, player outcomes." Gated
 * behind SponsorEntitlement — see the schema comment on SponsorEntitlement
 * for why there's no self-serve purchase path.
 */
@Injectable()
export class ImpactReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardService: SponsorDashboardService,
    private readonly pdfRenderer: PdfRendererService,
    private readonly s3: S3StorageService,
  ) {}

  async generateDataset(competitionId: string): Promise<ImpactReportDataset> {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      select: { id: true, name: true, season: true, slug: true },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    const [dashboard, entries, players, brandedGraphicsDelivered, outcomeRows] =
      await Promise.all([
        this.dashboardService.getForSlug(competition.slug),
        this.prisma.competitionEntry.findMany({
          where: { competitionId },
          include: { team: { select: { name: true, community: true } } },
        }),
        this.prisma.playerRegistration.findMany({
          where: { competitionId, status: { in: ['CONFIRMED', 'LOCKED'] } },
          include: { player: { select: { dateOfBirth: true, gender: true } } },
        }),
        this.prisma.graphic.count({
          where: { competitionId, status: 'READY' },
        }),
        this.prisma.playerOutcome.findMany({
          where: { player: { registrations: { some: { competitionId } } } },
          include: { player: { select: { firstName: true, lastName: true } } },
          orderBy: { occurredAt: 'desc' },
        }),
      ]);

    const ageGenderCounts = new Map<string, number>();
    for (const registration of players) {
      const bucket = ageBucket(registration.player.dateOfBirth);
      const gender = registration.player.gender ?? 'Unknown';
      const key = `${bucket}|${gender}`;
      ageGenderCounts.set(key, (ageGenderCounts.get(key) ?? 0) + 1);
    }

    return {
      competitionName: competition.name,
      season: competition.season,
      generatedAt: new Date().toISOString(),
      reach: {
        teamsRegistered: dashboard.teamsRegistered,
        playersRegistered: dashboard.playersRegistered,
        matchesPlayed: dashboard.matchesPlayed,
        matchesVerified: dashboard.matchesVerified,
        communitiesCovered: dashboard.communitiesCovered,
        totalMinutes: dashboard.totalMinutes,
        pageViews: dashboard.pageViews,
        graphicsShared: dashboard.graphicsShared,
        brandedGraphicsDelivered,
      },
      teamsAndCommunities: entries.map((entry) => ({
        teamName: entry.team.name,
        community: entry.team.community,
      })),
      playersByAgeGroupAndGender: [...ageGenderCounts.entries()].map(
        ([key, count]) => {
          const [ageGroup, gender] = key.split('|');
          return { ageGroup, gender, count };
        },
      ),
      playerOutcomes: outcomeRows.map((row) => ({
        playerName: `${row.player.firstName} ${row.player.lastName}`,
        type: row.type,
        description: row.description,
        sourceNote: row.sourceNote,
        occurredAt: row.occurredAt.toISOString(),
      })),
    };
  }

  toCsv(dataset: ImpactReportDataset): string {
    const sections = [
      `Impact Report — ${dataset.competitionName} (${dataset.season})`,
      `Generated: ${dataset.generatedAt}`,
      '',
      'REACH',
      toCsvTable(
        ['Metric', 'Value'],
        Object.entries(dataset.reach).map(([k, v]) => [k, String(v)]),
      ),
      '',
      'TEAMS AND COMMUNITIES',
      toCsvTable(
        ['Team', 'Community'],
        dataset.teamsAndCommunities.map((t) => [t.teamName, t.community ?? '']),
      ),
      '',
      'PLAYERS BY AGE GROUP AND GENDER',
      toCsvTable(
        ['Age group', 'Gender', 'Count'],
        dataset.playersByAgeGroupAndGender.map((r) => [
          r.ageGroup,
          r.gender,
          String(r.count),
        ]),
      ),
      '',
      'PLAYER OUTCOMES',
      toCsvTable(
        ['Player', 'Type', 'Description', 'Source', 'Date'],
        dataset.playerOutcomes.map((o) => [
          o.playerName,
          o.type,
          o.description,
          o.sourceNote,
          o.occurredAt,
        ]),
      ),
    ];

    return sections.join('\n');
  }

  async generatePdf(dataset: ImpactReportDataset): Promise<Buffer> {
    return this.pdfRenderer.render((doc) => {
      doc.header(dataset.competitionName, `Impact Report — ${dataset.season}`);

      doc.sectionTitle('Reach');
      doc.statGrid([
        {
          label: 'Teams registered',
          value: String(dataset.reach.teamsRegistered),
        },
        {
          label: 'Players registered',
          value: String(dataset.reach.playersRegistered),
        },
        {
          label: 'Matches verified',
          value: `${dataset.reach.matchesVerified} / ${dataset.reach.matchesPlayed}`,
        },
        {
          label: 'Communities covered',
          value: String(dataset.reach.communitiesCovered),
        },
        {
          label: 'Minutes delivered',
          value: dataset.reach.totalMinutes.toLocaleString(),
        },
        {
          label: 'Page views',
          value: dataset.reach.pageViews.toLocaleString(),
        },
        {
          label: 'Graphics shared',
          value: String(dataset.reach.graphicsShared),
        },
        {
          label: 'Branded graphics delivered',
          value: String(dataset.reach.brandedGraphicsDelivered),
        },
      ]);

      doc.sectionTitle('Players by age group and gender');
      doc.table(
        ['Age group', 'Gender', 'Count'],
        dataset.playersByAgeGroupAndGender.map((r) => [
          r.ageGroup,
          r.gender,
          String(r.count),
        ]),
      );

      doc.sectionTitle('Teams and communities');
      doc.table(
        ['Team', 'Community'],
        dataset.teamsAndCommunities.map((t) => [
          t.teamName,
          t.community ?? '—',
        ]),
      );

      if (dataset.playerOutcomes.length > 0) {
        doc.sectionTitle('Player outcomes');
        doc.table(
          ['Player', 'Type', 'Description'],
          dataset.playerOutcomes.map((o) => [
            o.playerName,
            o.type,
            o.description,
          ]),
        );
      }

      doc.signatureFooter();
    });
  }

  async generateAndUploadPdf(
    competitionId: string,
  ): Promise<{ dataset: ImpactReportDataset; url: string }> {
    const dataset = await this.generateDataset(competitionId);
    const pdf = await this.generatePdf(dataset);
    const key = `impact-reports/${competitionId}/${Date.now()}.pdf`;
    await this.s3.putObject(key, pdf, 'application/pdf');

    return { dataset, url: this.s3.publicUrlFor(key) };
  }
}
