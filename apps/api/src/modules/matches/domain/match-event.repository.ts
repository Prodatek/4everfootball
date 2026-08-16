import type { MatchEventType, Prisma } from '@prisma/client';
import type { PrismaTransactionClient } from '../../../common/prisma/prisma-transaction.type';
import type { MatchEventEntity } from './match-event.entity';

export const MATCH_EVENT_REPOSITORY = Symbol('MATCH_EVENT_REPOSITORY');

export interface CreateMatchEventInput {
  // id/createdAt/prevHash/hash are generated in MatchEventsService (not left
  // to DB defaults) so the exact values that go into the hash are the exact
  // values that get stored — see event-hash-chain.ts.
  id: string;
  fixtureId: string;
  type: MatchEventType;
  minute: number;
  stoppageMinute?: number;
  teamId?: string;
  playerId?: string;
  assistPlayerId?: string;
  metadata?: Prisma.InputJsonValue;
  clientEventId: string;
  correctsEventId?: string;
  correctionReason?: string;
  recordedById: string;
  createdAt: Date;
  prevHash: string;
  hash: string;
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
  /** Most recent event for a fixture by sequence — the tail of its hash chain. */
  findLastByFixtureId(
    fixtureId: string,
    tx?: PrismaTransactionClient,
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
  // No delete(). match_events is append-only — see migration
  // 1_event_log_immutability, which also enforces this at the database
  // level so removing this method is a real guarantee, not just an API
  // that happens not to be called.
}
