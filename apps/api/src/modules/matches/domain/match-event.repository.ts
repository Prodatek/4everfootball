import type { MatchEventType, Prisma } from '@prisma/client';
import type { PrismaTransactionClient } from '../../../common/prisma/prisma-transaction.type';
import type { MatchEventEntity } from './match-event.entity';

export const MATCH_EVENT_REPOSITORY = Symbol('MATCH_EVENT_REPOSITORY');

export interface CreateMatchEventInput {
  fixtureId: string;
  type: MatchEventType;
  minute: number;
  stoppageMinute?: number;
  teamId?: string;
  playerId?: string;
  assistPlayerId?: string;
  metadata?: Prisma.InputJsonValue;
  clientEventId: string;
  recordedById?: string;
}

export interface MatchEventRepository {
  findByFixtureId(
    fixtureId: string,
    tx?: PrismaTransactionClient,
  ): Promise<MatchEventEntity[]>;
  findById(id: string): Promise<MatchEventEntity | null>;
  findByClientEventId(
    fixtureId: string,
    clientEventId: string,
  ): Promise<MatchEventEntity | null>;
  /** Events from FINISHED fixtures in a competition — the basis for top scorers/assists. */
  findByCompetitionId(
    competitionId: string,
    types?: MatchEventType[],
  ): Promise<MatchEventEntity[]>;
  /** Every event a player was involved in (as playerId or assistPlayerId) from FINISHED fixtures. */
  findByPlayerId(
    playerId: string,
    competitionId?: string,
  ): Promise<MatchEventEntity[]>;
  create(
    input: CreateMatchEventInput,
    tx?: PrismaTransactionClient,
  ): Promise<MatchEventEntity>;
  delete(id: string, tx?: PrismaTransactionClient): Promise<void>;
}
