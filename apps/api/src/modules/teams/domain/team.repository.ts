import type { TeamEntity } from './team.entity';

export const TEAM_REPOSITORY = Symbol('TEAM_REPOSITORY');

export type TeamSortField = 'name' | 'foundedYear' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

export interface TeamListFilters {
  page: number;
  limit: number;
  search?: string;
  country?: string;
  // §5 B2 of MONETISATION_UI_BRIEF.md — lets a new club account search for
  // an existing, not-yet-claimed team (organisationId IS NULL) to attach
  // to their organisation via TeamsService.claim().
  unclaimed?: boolean;
  // §5 F2: a coach picking which existing club/squad to attach to an
  // academy age group needs "just this org's teams" — no filter for that
  // existed before (only the inverse, unclaimed).
  organisationId?: string;
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
  // Set only via TeamsService.claim() — deliberately kept out of
  // UpdateTeamDto (a platform-admin-only route) since claiming is an
  // org-scoped self-service action with its own authorization check.
  organisationId?: string;
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
