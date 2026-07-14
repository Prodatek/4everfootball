import { Injectable, NotFoundException } from '@nestjs/common';
import type { MatchEventType } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { PrismaTransactionClient } from '../../../common/prisma/prisma-transaction.type';
import { MatchEventEntity } from '../domain/match-event.entity';
import type {
  CreateMatchEventInput,
  MatchEventRepository,
} from '../domain/match-event.repository';

const playerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  slug: true,
} as const;
const matchEventInclude = {
  player: { select: playerSelect },
  assistPlayer: { select: playerSelect },
} as const;

@Injectable()
export class PrismaMatchEventRepository implements MatchEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByFixtureId(
    fixtureId: string,
    tx?: PrismaTransactionClient,
  ): Promise<MatchEventEntity[]> {
    const records = await (tx ?? this.prisma).matchEvent.findMany({
      where: { fixtureId },
      include: matchEventInclude,
      orderBy: { sequence: 'asc' },
    });

    return records.map((record) => new MatchEventEntity(record));
  }

  async findById(id: string): Promise<MatchEventEntity | null> {
    const record = await this.prisma.matchEvent.findUnique({
      where: { id },
      include: matchEventInclude,
    });
    return record ? new MatchEventEntity(record) : null;
  }

  async findByClientEventId(
    fixtureId: string,
    clientEventId: string,
  ): Promise<MatchEventEntity | null> {
    const record = await this.prisma.matchEvent.findUnique({
      where: { fixtureId_clientEventId: { fixtureId, clientEventId } },
      include: matchEventInclude,
    });
    return record ? new MatchEventEntity(record) : null;
  }

  async findByCompetitionId(
    competitionId: string,
    types?: MatchEventType[],
  ): Promise<MatchEventEntity[]> {
    const records = await this.prisma.matchEvent.findMany({
      where: {
        fixture: { competitionId, status: 'FINISHED' },
        ...(types ? { type: { in: types } } : {}),
      },
      include: matchEventInclude,
    });

    return records.map((record) => new MatchEventEntity(record));
  }

  async findByPlayerId(
    playerId: string,
    competitionId?: string,
  ): Promise<MatchEventEntity[]> {
    const records = await this.prisma.matchEvent.findMany({
      where: {
        OR: [{ playerId }, { assistPlayerId: playerId }],
        fixture: {
          status: 'FINISHED',
          ...(competitionId ? { competitionId } : {}),
        },
      },
      include: matchEventInclude,
    });

    return records.map((record) => new MatchEventEntity(record));
  }

  async create(
    input: CreateMatchEventInput,
    tx?: PrismaTransactionClient,
  ): Promise<MatchEventEntity> {
    const record = await (tx ?? this.prisma).matchEvent.create({
      data: input,
      include: matchEventInclude,
    });
    return new MatchEventEntity(record);
  }

  async delete(id: string, tx?: PrismaTransactionClient): Promise<void> {
    try {
      await (tx ?? this.prisma).matchEvent.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Match event not found');
    }
  }
}
