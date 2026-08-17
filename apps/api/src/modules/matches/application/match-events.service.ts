import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { FixtureStatus, MatchEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { PrismaTransactionClient } from '../../../common/prisma/prisma-transaction.type';
import { FixturesService } from '../../fixtures/application/fixtures.service';
import { PlayersService } from '../../players/application/players.service';
import { GraphicsService } from '../../graphics/application/graphics.service';
import { StandingsService } from '../../standings/application/standings.service';
import {
  PLAYER_GOAL_MILESTONES,
  crossedMilestone,
} from '../../graphics/domain/milestones';
import { startOfDay, endOfDay } from '../../graphics/domain/date-windows';
import { aggregateTopScorers } from '../../stats/domain/stats-aggregator';
import { deriveScore } from '../domain/score-deriver';
import {
  computeEventHash,
  seedHash,
  verifyEventChain,
  type ChainedEvent,
} from '../domain/event-hash-chain';
import { MATCH_EVENT_REPOSITORY } from '../domain/match-event.repository';
import type { MatchEventRepository } from '../domain/match-event.repository';
import { MatchEventsGateway } from '../infrastructure/match-events.gateway';
import type { CreateMatchEventDto } from './dto/create-match-event.dto';

const STATUS_TRANSITIONS: Partial<Record<string, FixtureStatus>> = {
  KICKOFF: 'LIVE',
  FULL_TIME: 'FINISHED',
};

@Injectable()
export class MatchEventsService {
  private readonly logger = new Logger(MatchEventsService.name);

  constructor(
    @Inject(MATCH_EVENT_REPOSITORY)
    private readonly matchEventRepository: MatchEventRepository,
    private readonly fixturesService: FixturesService,
    private readonly playersService: PlayersService,
    private readonly prisma: PrismaService,
    private readonly gateway: MatchEventsGateway,
    private readonly graphicsService: GraphicsService,
    private readonly standingsService: StandingsService,
  ) {}

  async listForFixture(fixtureId: string) {
    await this.fixturesService.getById(fixtureId);
    const events = await this.matchEventRepository.findByFixtureId(fixtureId);
    return events.map((event) => event.toPublic());
  }

  async listForCompetition(competitionId: string, types?: MatchEventType[]) {
    const events = await this.matchEventRepository.findByCompetitionId(
      competitionId,
      types,
    );
    return events.map((event) => event.toPublic());
  }

  async listForPlayer(playerId: string, competitionId?: string) {
    const events = await this.matchEventRepository.findByPlayerId(
      playerId,
      competitionId,
    );
    return events.map((event) => event.toPublic());
  }

  async getLiveState(fixtureId: string) {
    const fixture = await this.fixturesService.getById(fixtureId);
    const events = await this.matchEventRepository.findByFixtureId(fixtureId);
    const lastEvent =
      events.length > 0 ? events[events.length - 1].toPublic() : null;

    return {
      fixtureId,
      status: fixture.status,
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      lastEvent,
    };
  }

  /**
   * Recomputes and verifies the full hash chain for a fixture by replaying
   * every event from the seed. Public-facing (GET /fixtures/:id/verify) —
   * this is a sales feature (brief §2.1), not an internal debug route, so
   * the response shape is meant to be shown to a skeptical organiser, not
   * just read by an engineer.
   */
  async verifyChain(fixtureId: string) {
    await this.fixturesService.getById(fixtureId);
    const events = await this.matchEventRepository.findByFixtureId(fixtureId);
    const chained: ChainedEvent[] = events.map((event) => event.toHashable());
    const result = verifyEventChain(fixtureId, chained);

    return { ...result, verifiedAt: new Date().toISOString() };
  }

  async recordEvent(
    fixtureId: string,
    dto: CreateMatchEventDto,
    recordedById: string,
  ) {
    const fixture = await this.fixturesService.getById(fixtureId);

    const existing = await this.matchEventRepository.findByClientEventId(
      fixtureId,
      dto.clientEventId,
    );

    if (existing) {
      return existing.toPublic();
    }

    if (
      dto.teamId &&
      dto.teamId !== fixture.homeTeamId &&
      dto.teamId !== fixture.awayTeamId
    ) {
      throw new BadRequestException(
        'teamId must be one of the two teams playing in this fixture',
      );
    }

    const playerIds = [dto.playerId, dto.assistPlayerId].filter(
      (id): id is string => Boolean(id),
    );

    for (const playerId of playerIds) {
      const player = await this.playersService.findById(playerId);

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      if (
        player.teamId !== fixture.homeTeamId &&
        player.teamId !== fixture.awayTeamId
      ) {
        throw new BadRequestException(
          'Player does not belong to either team in this fixture',
        );
      }

      await this.assertRegistrationEligible(playerId, fixture.competitionId);
    }

    if (dto.type === 'CORRECTION') {
      if (!dto.correctsEventId || !dto.correctionReason) {
        throw new BadRequestException(
          'CORRECTION events require both correctsEventId and correctionReason',
        );
      }

      const corrected = await this.matchEventRepository.findById(
        dto.correctsEventId,
      );

      if (!corrected || corrected.fixtureId !== fixtureId) {
        throw new BadRequestException(
          'correctsEventId must refer to an existing event on this fixture',
        );
      }
    } else if (dto.correctsEventId || dto.correctionReason) {
      throw new BadRequestException(
        'correctsEventId/correctionReason are only valid on CORRECTION events',
      );
    }

    const id = randomUUID();
    const createdAt = new Date();

    const event = await this.prisma.$transaction(async (tx) => {
      // Locking the fixture row for the duration of this transaction
      // serializes concurrent writers on the SAME fixture (the brief's own
      // "two recorders on the same match" scenario) so the prevHash read
      // below can never race with another insert — without this, two scouts
      // tapping at the same instant could both read the same "last hash"
      // and produce two events pointing at the same prevHash, breaking the
      // chain's linearity.
      await tx.$queryRaw`SELECT id FROM "fixtures" WHERE id = ${fixtureId} FOR UPDATE`;

      const last = await this.matchEventRepository.findLastByFixtureId(
        fixtureId,
        tx,
      );
      const prevHash = last ? last.hash : seedHash(fixtureId);

      const hashableFields = {
        id,
        fixtureId,
        type: dto.type,
        minute: dto.minute,
        stoppageMinute: dto.stoppageMinute ?? null,
        teamId: dto.teamId ?? null,
        playerId: dto.playerId ?? null,
        assistPlayerId: dto.assistPlayerId ?? null,
        metadata: (dto.metadata as Prisma.InputJsonValue | undefined) ?? null,
        clientEventId: dto.clientEventId,
        correctsEventId: dto.correctsEventId ?? null,
        correctionReason: dto.correctionReason ?? null,
        recordedById,
        createdAt,
      };
      const hash = computeEventHash(prevHash, hashableFields);

      const created = await this.matchEventRepository.create(
        { ...hashableFields, prevHash, hash },
        tx,
      );

      await this.recomputeFixture(
        fixtureId,
        fixture.homeTeamId,
        fixture.awayTeamId,
        dto.type,
        tx,
      );

      return created;
    });

    const publicEvent = event.toPublic();
    this.gateway.broadcastEvent(fixtureId, publicEvent);
    this.gateway.broadcastState(fixtureId, await this.getLiveState(fixtureId));

    // Best-effort and awaited, but only the fast part: this enqueues a
    // Graphic row (a handful of lightweight DB reads/writes), never
    // renders an image or touches the network — the brief's "never block
    // a request on image rendering" is about the render step, which
    // GraphicsWorkerService does entirely off this request path. A
    // failure here must never fail the request that recorded a real
    // match event, so errors are caught and logged, not thrown.
    try {
      await this.triggerGraphicsForEvent(fixtureId, dto.type, publicEvent);
    } catch (error) {
      this.logger.error(
        `Graphics trigger failed for fixture ${fixtureId} event ${publicEvent.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return publicEvent;
  }

  private async triggerGraphicsForEvent(
    fixtureId: string,
    eventType: MatchEventType,
    event: {
      id: string;
      playerId: string | null;
      teamId: string | null;
      minute: number;
      stoppageMinute: number | null;
    },
  ): Promise<void> {
    if (eventType !== 'GOAL' && eventType !== 'FULL_TIME') {
      return;
    }

    const fixture = await this.getFixtureWithTeams(fixtureId);

    if (!fixture) {
      return;
    }

    if (eventType === 'GOAL') {
      await this.triggerGoalGraphics(fixture, event);
    } else {
      await this.triggerFullTimeGraphics(fixture);
    }
  }

  private async triggerGoalGraphics(
    fixture: NonNullable<
      Awaited<ReturnType<MatchEventsService['getFixtureWithTeams']>>
    >,
    event: {
      id: string;
      playerId: string | null;
      teamId: string | null;
      minute: number;
      stoppageMinute: number | null;
    },
  ): Promise<void> {
    if (!event.playerId || !event.teamId) {
      return;
    }

    const player = await this.playersService.findById(event.playerId);
    if (!player) {
      return;
    }

    const scoringTeamName =
      event.teamId === fixture.homeTeamId
        ? fixture.homeTeam.name
        : fixture.awayTeam.name;

    await this.graphicsService.enqueue({
      template: 'GOAL_ALERT',
      competitionId: fixture.competitionId,
      subjectType: 'MATCH_EVENT',
      subjectId: event.id,
      data: {
        competitionName: fixture.competition.name,
        scorerName: `${player.firstName} ${player.lastName}`,
        scoringTeamName,
        minute: event.minute,
        stoppageMinute: event.stoppageMinute,
        homeTeamName: fixture.homeTeam.name,
        awayTeamName: fixture.awayTeam.name,
        homeScore: fixture.homeScore ?? 0,
        awayScore: fixture.awayScore ?? 0,
      },
    });

    const goalCount = await this.prisma.matchEvent.count({
      where: {
        playerId: event.playerId,
        type: { in: ['GOAL', 'PENALTY_SCORED'] },
      },
    });
    const milestone = crossedMilestone(goalCount, PLAYER_GOAL_MILESTONES);

    if (milestone !== null) {
      await this.graphicsService.enqueue({
        template: 'MILESTONE',
        competitionId: fixture.competitionId,
        subjectType: 'PLAYER',
        subjectId: event.playerId,
        data: {
          headline: `Goal #${milestone}`,
          subheadline: `${player.firstName} ${player.lastName}`,
          contextLabel: `${fixture.competition.name} · career milestone`,
        },
      });
    }
  }

  private async triggerFullTimeGraphics(
    fixture: NonNullable<
      Awaited<ReturnType<MatchEventsService['getFixtureWithTeams']>>
    >,
  ): Promise<void> {
    await this.graphicsService.enqueue({
      template: 'FULL_TIME_RESULT',
      competitionId: fixture.competitionId,
      subjectType: 'FIXTURE',
      subjectId: fixture.id,
      data: {
        competitionName: fixture.competition.name,
        homeTeamName: fixture.homeTeam.name,
        awayTeamName: fixture.awayTeam.name,
        homeScore: fixture.homeScore ?? 0,
        awayScore: fixture.awayScore ?? 0,
        homeLogoUrl: fixture.homeTeam.logoUrl,
        awayLogoUrl: fixture.awayTeam.logoUrl,
        venueName: fixture.venueName,
        kickoffDate: fixture.kickoffAt.toISOString(),
      },
    });

    await this.triggerLeagueTableIfRoundOver(fixture);
    await this.triggerSeasonSummaryIfSeasonOver(fixture);
    await this.cacheChainVerification(fixture.id);
  }

  /**
   * Phase 4 (brief §5.1): the sponsor dashboard's "matches verified" metric
   * needs this number cheaply on every dashboard load — re-replaying every
   * fixture's full hash chain on demand doesn't scale. Computed once here,
   * at the same point the chain is already complete (FULL_TIME), and
   * cached on the fixture; GET /fixtures/:id/verify (Phase 1) remains the
   * live, on-demand replay for a skeptical organiser who wants to check
   * one fixture themselves.
   */
  private async cacheChainVerification(fixtureId: string): Promise<void> {
    const result = await this.verifyChain(fixtureId);

    await this.prisma.fixture.update({
      where: { id: fixtureId },
      data: { chainVerified: result.valid, verifiedAt: new Date() },
    });
  }

  /**
   * "League table card — end of each round" (brief §4). This schema has no
   * `round`/`matchday` concept (fixtures just carry a date) — read as "the
   * last fixture scheduled for this competition on this calendar day just
   * finished," computed from existing fixture data rather than a field
   * that doesn't exist. Flagged in the Phase 3 plan.
   */
  private async triggerLeagueTableIfRoundOver(
    fixture: NonNullable<
      Awaited<ReturnType<MatchEventsService['getFixtureWithTeams']>>
    >,
  ): Promise<void> {
    const dayStart = startOfDay(fixture.kickoffAt);
    const dayEnd = endOfDay(fixture.kickoffAt);

    const stillPending = await this.prisma.fixture.count({
      where: {
        competitionId: fixture.competitionId,
        kickoffAt: { gte: dayStart, lte: dayEnd },
        status: { in: ['SCHEDULED', 'LIVE'] },
      },
    });

    if (stillPending > 0) {
      return;
    }

    const table = await this.standingsService
      .getTable(fixture.competitionId)
      .catch(() => []);
    if (table.length === 0) {
      return;
    }

    await this.graphicsService.enqueue({
      template: 'LEAGUE_TABLE',
      competitionId: fixture.competitionId,
      subjectType: 'COMPETITION',
      subjectId: fixture.competitionId,
      data: {
        competitionName: fixture.competition.name,
        roundLabel: `As of ${fixture.kickoffAt.toDateString()}`,
        rows: table.slice(0, 10).map((row) => ({
          position: row.position,
          teamName: row.teamName,
          played: row.played,
          points: row.points,
          goalDifference: row.goalDifference,
        })),
      },
    });
  }

  /**
   * "Season summary — final matchday" (brief §4). Read as "no fixtures
   * remain SCHEDULED/LIVE anywhere in this competition" — same reasoning
   * as triggerLeagueTableIfRoundOver above.
   */
  private async triggerSeasonSummaryIfSeasonOver(
    fixture: NonNullable<
      Awaited<ReturnType<MatchEventsService['getFixtureWithTeams']>>
    >,
  ): Promise<void> {
    const remaining = await this.prisma.fixture.count({
      where: {
        competitionId: fixture.competitionId,
        status: { in: ['SCHEDULED', 'LIVE'] },
      },
    });

    if (remaining > 0) {
      return;
    }

    const table = await this.standingsService
      .getTable(fixture.competitionId)
      .catch(() => []);
    const champion = table[0] ?? null;

    const finishedGoalEvents = await this.prisma.matchEvent.findMany({
      where: {
        type: { in: ['GOAL', 'PENALTY_SCORED'] },
        fixture: { competitionId: fixture.competitionId, status: 'FINISHED' },
      },
      include: { player: true },
    });
    const topScorers = aggregateTopScorers(
      finishedGoalEvents.map((event) => ({
        fixtureId: event.fixtureId,
        type: event.type,
        playerId: event.playerId,
        player: event.player,
        assistPlayerId: null,
        assistPlayer: null,
      })),
    );
    const topScorer = topScorers[0] ?? null;

    const totalMatches = await this.prisma.fixture.count({
      where: { competitionId: fixture.competitionId, status: 'FINISHED' },
    });

    await this.graphicsService.enqueue({
      template: 'SEASON_SUMMARY',
      competitionId: fixture.competitionId,
      subjectType: 'COMPETITION',
      subjectId: fixture.competitionId,
      data: {
        competitionName: fixture.competition.name,
        season: fixture.competition.season,
        championTeamName: champion?.teamName ?? null,
        topScorerName: topScorer?.playerName ?? null,
        topScorerGoals: topScorer?.count ?? null,
        totalMatches,
        totalGoals: finishedGoalEvents.length,
      },
    });
  }

  private async getFixtureWithTeams(fixtureId: string) {
    return this.prisma.fixture.findUnique({
      where: { id: fixtureId },
      include: { homeTeam: true, awayTeam: true, competition: true },
    });
  }

  /**
   * Enforces the Phase 2 brief's "unpaid squad cannot be selected for a
   * fixture" rule at the actual point a player becomes selectable today —
   * there is no separate pre-match squad-selection step in this codebase.
   * A raw query (not a PlayerRegistrationsService import) avoids adding a
   * new cross-module dependency from MatchesModule onto
   * PlayerRegistrationsModule/PaymentsModule/OrganisationsModule for a
   * single boolean check. Competitions with no PlayerRegistration rows at
   * all (i.e. every competition that predates paid registration) are
   * untouched — this only activates once a registration row exists for
   * that player in that competition.
   */
  private async assertRegistrationEligible(
    playerId: string,
    competitionId: string,
  ): Promise<void> {
    const registration = await this.prisma.playerRegistration.findUnique({
      where: { competitionId_playerId: { competitionId, playerId } },
      select: { status: true },
    });

    if (!registration) {
      return;
    }

    if (
      registration.status !== 'CONFIRMED' &&
      registration.status !== 'LOCKED'
    ) {
      throw new BadRequestException(
        'This player has an unpaid or incomplete registration for this competition and cannot be selected until it is confirmed',
      );
    }
  }

  private async recomputeFixture(
    fixtureId: string,
    homeTeamId: string,
    awayTeamId: string,
    triggeringEventType: string | undefined,
    tx: PrismaTransactionClient,
  ) {
    const events = await this.matchEventRepository.findByFixtureId(
      fixtureId,
      tx,
    );
    const { homeScore, awayScore } = deriveScore(
      events.map((event) => {
        const props = event.toPublic();
        return {
          id: props.id,
          type: props.type,
          teamId: props.teamId,
          correctsEventId: props.correctsEventId,
          metadata: props.metadata as Record<string, unknown> | null,
        };
      }),
      homeTeamId,
      awayTeamId,
    );

    const status = triggeringEventType
      ? STATUS_TRANSITIONS[triggeringEventType]
      : undefined;

    await this.fixturesService.applyMatchEngineUpdate(
      fixtureId,
      { homeScore, awayScore, status },
      tx,
    );
  }
}
