import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface SponsorDashboard {
  competitionName: string;
  competitionLogoUrl: string | null;
  sponsorLogoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  teamsRegistered: number;
  playersRegistered: number;
  matchesPlayed: number;
  matchesVerified: number;
  communitiesCovered: number;
  totalMinutes: number;
  pageViews: number;
  graphicsShared: number;
}

/**
 * Every number here is derived from existing tables at read time — brief
 * §5.1: "everything must be derived from the verified record, never
 * hand-entered. That is the entire selling proposition." Public and
 * ungated (unlike ImpactReportService's PDF): this is meant to sit
 * directly on the sponsor-branded public competition page, not behind a
 * login.
 */
@Injectable()
export class SponsorDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getForSlug(slug: string): Promise<SponsorDashboard> {
    const competition = await this.prisma.competition.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        pageViewCount: true,
        logoUrl: true,
        sponsorLogoUrl: true,
        primaryColor: true,
        secondaryColor: true,
      },
    });

    if (!competition) {
      throw new NotFoundException('Competition not found');
    }

    const [
      teamsRegistered,
      playersRegistered,
      matchesPlayed,
      matchesVerified,
      communities,
      minutesAgg,
      graphicsAgg,
    ] = await Promise.all([
      this.prisma.competitionEntry.count({
        where: { competitionId: competition.id },
      }),
      this.prisma.playerRegistration.count({
        where: {
          competitionId: competition.id,
          status: { in: ['CONFIRMED', 'LOCKED'] },
        },
      }),
      this.prisma.fixture.count({
        where: { competitionId: competition.id, status: 'FINISHED' },
      }),
      this.prisma.fixture.count({
        where: {
          competitionId: competition.id,
          status: 'FINISHED',
          chainVerified: true,
        },
      }),
      this.prisma.team.findMany({
        where: {
          competitionEntries: { some: { competitionId: competition.id } },
          community: { not: null },
        },
        distinct: ['community'],
        select: { community: true },
      }),
      this.prisma.matchEvent.aggregate({
        where: {
          type: 'FULL_TIME',
          fixture: { competitionId: competition.id },
        },
        _sum: { minute: true, stoppageMinute: true },
      }),
      this.prisma.graphic.aggregate({
        where: { competitionId: competition.id },
        _sum: { shareCount: true },
      }),
    ]);

    return {
      competitionName: competition.name,
      competitionLogoUrl: competition.logoUrl,
      sponsorLogoUrl: competition.sponsorLogoUrl,
      primaryColor: competition.primaryColor,
      secondaryColor: competition.secondaryColor,
      teamsRegistered,
      playersRegistered,
      matchesPlayed,
      matchesVerified,
      communitiesCovered: communities.length,
      totalMinutes:
        (minutesAgg._sum.minute ?? 0) + (minutesAgg._sum.stoppageMinute ?? 0),
      pageViews: competition.pageViewCount,
      graphicsShared: graphicsAgg._sum.shareCount ?? 0,
    };
  }
}
