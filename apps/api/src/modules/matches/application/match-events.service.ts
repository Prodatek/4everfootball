import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { FixtureStatus, MatchEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { PrismaTransactionClient } from '../../../common/prisma/prisma-transaction.type';
import { FixturesService } from '../../fixtures/application/fixtures.service';
import { PlayersService } from '../../players/application/players.service';
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
  constructor(
    @Inject(MATCH_EVENT_REPOSITORY)
    private readonly matchEventRepository: MatchEventRepository,
    private readonly fixturesService: FixturesService,
    private readonly playersService: PlayersService,
    private readonly prisma: PrismaService,
    private readonly gateway: MatchEventsGateway,
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

    return publicEvent;
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
