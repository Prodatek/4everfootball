import type { CompetitionTier, CompetitionType } from '@prisma/client';
import type { CompetitionEntity } from './competition.entity';

export const COMPETITION_REPOSITORY = Symbol('COMPETITION_REPOSITORY');

export type CompetitionSortField =
  'name' | 'season' | 'startDate' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

export interface CompetitionListFilters {
  page: number;
  limit: number;
  search?: string;
  type?: CompetitionType;
  country?: string;
  season?: string;
  // Added for MONETISATION_UI_BRIEF.md §5 A1/A4 — an organisation's
  // detail/dashboard page needs to list only its own competitions.
  organisationId?: string;
  sortBy: CompetitionSortField;
  sortOrder: SortOrder;
  includeInactive?: boolean;
}

export interface CompetitionListResult {
  items: CompetitionEntity[];
  total: number;
}

export interface CreateCompetitionInput {
  name: string;
  slug: string;
  type: CompetitionType;
  country?: string;
  season: string;
  startDate?: Date;
  endDate?: Date;
  logoUrl?: string;
  organisationId: string;
  // Media engine branding (Phase 3) — applied automatically to every
  // graphic generated for this competition; see GraphicsModule.
  primaryColor?: string;
  secondaryColor?: string;
  sponsorLogoUrl?: string;
}

export type UpdateCompetitionInput = Partial<
  Omit<CreateCompetitionInput, 'slug'>
> & {
  slug?: string;
  isActive?: boolean;
  // Set only via CompetitionsService.setTier() — the licence payment
  // endpoint prices strictly off this field server-side, so it's kept out
  // of the general-purpose UpdateCompetitionDto/update() to make the tier
  // change a deliberate, explicit action rather than a side effect of an
  // unrelated edit.
  tier?: CompetitionTier;
};

export interface CompetitionEntryRecord {
  entryId: string;
  teamId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  joinedAt: Date;
}

export interface CompetitionRepository {
  findMany(filters: CompetitionListFilters): Promise<CompetitionListResult>;
  findById(id: string): Promise<CompetitionEntity | null>;
  findBySlug(slug: string): Promise<CompetitionEntity | null>;
  slugExists(slug: string): Promise<boolean>;
  create(input: CreateCompetitionInput): Promise<CompetitionEntity>;
  update(id: string, input: UpdateCompetitionInput): Promise<CompetitionEntity>;
  delete(id: string): Promise<void>;

  listEntries(competitionId: string): Promise<CompetitionEntryRecord[]>;
  entryExists(competitionId: string, teamId: string): Promise<boolean>;
  addEntry(competitionId: string, teamId: string): Promise<void>;
  removeEntry(competitionId: string, teamId: string): Promise<void>;
}
