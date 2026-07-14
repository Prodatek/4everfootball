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

  async recordEvent(
    fixtureId: string,
    dto: CreateMatchEventDto,
    recordedById?: string,
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
    }

    const event = await this.prisma.$transaction(async (tx) => {
      const created = await this.matchEventRepository.create(
        {
          fixtureId,
          type: dto.type,
          minute: dto.minute,
          stoppageMinute: dto.stoppageMinute,
          teamId: dto.teamId,
          playerId: dto.playerId,
          assistPlayerId: dto.assistPlayerId,
          metadata: dto.metadata as Prisma.InputJsonValue | undefined,
          clientEventId: dto.clientEventId,
          recordedById,
        },
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

  async deleteEvent(fixtureId: string, eventId: string) {
    const fixture = await this.fixturesService.getById(fixtureId);
    const event = await this.matchEventRepository.findById(eventId);

    if (!event || event.fixtureId !== fixtureId) {
      throw new NotFoundException('Match event not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.matchEventRepository.delete(eventId, tx);
      await this.recomputeFixture(
        fixtureId,
        fixture.homeTeamId,
        fixture.awayTeamId,
        undefined,
        tx,
      );
    });

    this.gateway.broadcastEventRemoved(fixtureId, eventId);
    this.gateway.broadcastState(fixtureId, await this.getLiveState(fixtureId));
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
      events.map((event) => ({ type: event.type, teamId: event.teamId })),
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
