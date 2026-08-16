import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StandingsService } from '../../standings/application/standings.service';
import { StatsService } from '../../stats/application/stats.service';
import { GraphicsService } from './graphics.service';
import { addDays, endOfDay, startOfDay } from '../domain/date-windows';

const TOP_SCORERS_LIMIT = 8;
const WEEKLY_WINDOW_DAYS = 7;
const TIME_ZONE = 'Africa/Lagos';

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TIME_ZONE,
  });
}

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  });
}

/**
 * The three calendar-driven templates (brief §4: "Matchday fixtures card —
 * 7am on a matchday", "Top scorers leaderboard / Player of the Week —
 * weekly", "Head-to-head preview — day before a fixture"). LEAGUE_TABLE and
 * SEASON_SUMMARY are event-driven instead (see MatchEventsService's
 * FULL_TIME handling) since this schema has no `round`/`matchday` concept
 * to hang a fixed calendar rule on — see the Phase 3 plan's flagged
 * deviation.
 */
@Injectable()
export class GraphicsTriggersService {
  private readonly logger = new Logger(GraphicsTriggersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly standingsService: StandingsService,
    private readonly statsService: StatsService,
    private readonly graphicsService: GraphicsService,
  ) {}

  @Cron('0 7 * * *')
  async triggerMatchdayFixtures(): Promise<void> {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const fixtures = await this.prisma.fixture.findMany({
      where: {
        status: 'SCHEDULED',
        kickoffAt: { gte: todayStart, lte: todayEnd },
      },
      include: { homeTeam: true, awayTeam: true, competition: true },
      orderBy: { kickoffAt: 'asc' },
    });

    const byCompetition = new Map<string, typeof fixtures>();
    for (const fixture of fixtures) {
      const list = byCompetition.get(fixture.competitionId) ?? [];
      list.push(fixture);
      byCompetition.set(fixture.competitionId, list);
    }

    for (const [competitionId, competitionFixtures] of byCompetition) {
      await this.graphicsService.enqueue({
        template: 'MATCHDAY_FIXTURES',
        competitionId,
        subjectType: 'COMPETITION',
        subjectId: competitionId,
        data: {
          competitionName: competitionFixtures[0].competition.name,
          dateLabel: formatDateLabel(todayStart),
          fixtures: competitionFixtures.map((f) => ({
            homeTeamName: f.homeTeam.name,
            awayTeamName: f.awayTeam.name,
            kickoffTime: formatTimeLabel(f.kickoffAt),
          })),
        },
      });
    }

    this.logger.log(
      `Matchday fixtures: enqueued for ${byCompetition.size} competition(s)`,
    );
  }

  @Cron('0 9 * * *')
  async triggerHeadToHead(): Promise<void> {
    const tomorrow = addDays(new Date(), 1);
    const tomorrowStart = startOfDay(tomorrow);
    const tomorrowEnd = endOfDay(tomorrow);

    const fixtures = await this.prisma.fixture.findMany({
      where: {
        status: 'SCHEDULED',
        kickoffAt: { gte: tomorrowStart, lte: tomorrowEnd },
      },
      include: { homeTeam: true, awayTeam: true, competition: true },
    });

    for (const fixture of fixtures) {
      const form = await this.standingsService
        .getForm(fixture.competitionId, 5)
        .catch(() => []);
      const homeForm =
        form.find((f) => f.teamId === fixture.homeTeamId)?.results ?? [];

      await this.graphicsService.enqueue({
        template: 'HEAD_TO_HEAD',
        competitionId: fixture.competitionId,
        subjectType: 'FIXTURE',
        subjectId: fixture.id,
        data: {
          competitionName: fixture.competition.name,
          homeTeamName: fixture.homeTeam.name,
          awayTeamName: fixture.awayTeam.name,
          homeLogoUrl: fixture.homeTeam.logoUrl,
          awayLogoUrl: fixture.awayTeam.logoUrl,
          kickoffDateLabel: `${formatDateLabel(fixture.kickoffAt)} · ${formatTimeLabel(fixture.kickoffAt)}`,
          recentForm: homeForm,
        },
      });
    }

    this.logger.log(`Head-to-head: enqueued for ${fixtures.length} fixture(s)`);
  }

  @Cron('0 8 * * 1')
  async triggerWeeklyStats(): Promise<void> {
    const competitions = await this.prisma.competition.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    for (const competition of competitions) {
      await this.triggerTopScorers(competition.id, competition.name);
      await this.triggerPlayerOfWeek(competition.id, competition.name);
    }
  }

  private async triggerTopScorers(
    competitionId: string,
    competitionName: string,
  ): Promise<void> {
    const topScorers = await this.statsService
      .getTopScorers(competitionId)
      .catch(() => []);
    if (topScorers.length === 0) {
      return;
    }

    const top = topScorers.slice(0, TOP_SCORERS_LIMIT);
    const players = await this.prisma.player.findMany({
      where: { id: { in: top.map((row) => row.playerId) } },
      include: { team: true },
    });
    const teamNameByPlayer = new Map(
      players.map((p) => [p.id, p.team?.name ?? '—']),
    );

    await this.graphicsService.enqueue({
      template: 'TOP_SCORERS',
      competitionId,
      subjectType: 'COMPETITION',
      subjectId: competitionId,
      data: {
        competitionName,
        scorers: top.map((row) => ({
          playerName: row.playerName,
          teamName: teamNameByPlayer.get(row.playerId) ?? '—',
          goals: row.count,
        })),
      },
    });
  }

  private async triggerPlayerOfWeek(
    competitionId: string,
    competitionName: string,
  ): Promise<void> {
    const windowStart = addDays(new Date(), -WEEKLY_WINDOW_DAYS);

    const [goalEvents, assistEvents] = await Promise.all([
      this.prisma.matchEvent.findMany({
        where: {
          type: { in: ['GOAL', 'PENALTY_SCORED'] },
          playerId: { not: null },
          fixture: { competitionId, kickoffAt: { gte: windowStart } },
        },
        include: { player: { include: { team: true } } },
      }),
      this.prisma.matchEvent.findMany({
        where: {
          type: 'GOAL',
          assistPlayerId: { not: null },
          fixture: { competitionId, kickoffAt: { gte: windowStart } },
        },
        include: { assistPlayer: { include: { team: true } } },
      }),
    ]);

    if (goalEvents.length === 0 && assistEvents.length === 0) {
      return;
    }

    interface Tally {
      playerName: string;
      teamName: string;
      photoUrl: string | null;
      goals: number;
      assists: number;
    }
    const tally = new Map<string, Tally>();

    for (const event of goalEvents) {
      if (!event.playerId || !event.player) continue;
      const row = tally.get(event.playerId) ?? {
        playerName: `${event.player.firstName} ${event.player.lastName}`,
        teamName: event.player.team?.name ?? '—',
        photoUrl: event.player.photoUrl,
        goals: 0,
        assists: 0,
      };
      row.goals += 1;
      tally.set(event.playerId, row);
    }

    for (const event of assistEvents) {
      if (!event.assistPlayerId || !event.assistPlayer) continue;
      const row = tally.get(event.assistPlayerId) ?? {
        playerName: `${event.assistPlayer.firstName} ${event.assistPlayer.lastName}`,
        teamName: event.assistPlayer.team?.name ?? '—',
        photoUrl: event.assistPlayer.photoUrl,
        goals: 0,
        assists: 0,
      };
      row.assists += 1;
      tally.set(event.assistPlayerId, row);
    }

    // Simple weighting for a marketing card, not an official rating: a
    // goal counts for more than an assist, ties broken by goals.
    const [topPlayerId, topPlayer] = [...tally.entries()].sort(
      ([, a], [, b]) =>
        b.goals * 2 + b.assists - (a.goals * 2 + a.assists) ||
        b.goals - a.goals,
    )[0];

    await this.graphicsService.enqueue({
      template: 'PLAYER_OF_WEEK',
      competitionId,
      subjectType: 'PLAYER',
      subjectId: topPlayerId,
      data: {
        competitionName,
        weekLabel: formatDateLabel(new Date()),
        playerName: topPlayer.playerName,
        teamName: topPlayer.teamName,
        photoUrl: topPlayer.photoUrl,
        goals: topPlayer.goals,
        assists: topPlayer.assists,
      },
    });
  }
}
