import type { TeamEntity } from './team.entity';

export const TEAM_REPOSITORY = Symbol('TEAM_REPOSITORY');

export type TeamSortField = 'name' | 'foundedYear' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

export interface TeamListFilters {
  page: number;
  limit: number;
  search?: string;
  country?: string;
  sortBy: TeamSortField;
  sortOrder: SortOrder;
  includeInactive?: boolean;
}

export interface TeamListResult {
  items: TeamEntity[];
  total: number;
}

export interface CreateTeamInput {
  name: string;
  slug: string;
  shortName?: string;
  country?: string;
  foundedYear?: number;
  logoUrl?: string;
  venueName?: string;
}

export type UpdateTeamInput = Partial<Omit<CreateTeamInput, 'slug'>> & {
  slug?: string;
  isActive?: boolean;
};

export interface TeamRepository {
  findMany(filters: TeamListFilters): Promise<TeamListResult>;
  findById(id: string): Promise<TeamEntity | null>;
  findBySlug(slug: string): Promise<TeamEntity | null>;
  slugExists(slug: string): Promise<boolean>;
  create(input: CreateTeamInput): Promise<TeamEntity>;
  update(id: string, input: UpdateTeamInput): Promise<TeamEntity>;
  delete(id: string): Promise<void>;
}
