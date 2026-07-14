import type { FixtureStatus } from '@prisma/client';
import type { FixtureEntity } from './fixture.entity';

export const FIXTURE_REPOSITORY = Symbol('FIXTURE_REPOSITORY');

export type FixtureSortField = 'kickoffAt' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

export interface FixtureListFilters {
  page: number;
  limit: number;
  competitionId?: string;
  teamId?: string;
  status?: FixtureStatus;
  fromDate?: Date;
  toDate?: Date;
  sortBy: FixtureSortField;
  sortOrder: SortOrder;
}

export interface FixtureListResult {
  items: FixtureEntity[];
  total: number;
}

export interface CreateFixtureInput {
  competitionId: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffAt: Date;
  venueName?: string;
  matchday?: string;
}

export interface UpdateFixtureInput {
  kickoffAt?: Date;
  venueName?: string;
  matchday?: string;
  status?: FixtureStatus;
  homeScore?: number | null;
  awayScore?: number | null;
}

export interface FixtureRepository {
  findMany(filters: FixtureListFilters): Promise<FixtureListResult>;
  findById(id: string): Promise<FixtureEntity | null>;
  create(input: CreateFixtureInput): Promise<FixtureEntity>;
  update(id: string, input: UpdateFixtureInput): Promise<FixtureEntity>;
  delete(id: string): Promise<void>;
}
