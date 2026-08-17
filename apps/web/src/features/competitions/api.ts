import type {
  Competition,
  CompetitionEntryTeam,
  CompetitionType,
  PaginatedResult,
} from "@4ef/shared";
import { apiClient } from "@/lib/api-client";

// @4ef/shared's Competition type predates the licensing fields (Phase 2) —
// they're present on the wire (the API's toPublic() spreads every column)
// but untyped there. Extended locally rather than touching the shared
// package for this pass.
export type CompetitionTier = "COMMUNITY" | "LEAGUE" | "CHAMPIONSHIP" | "FEDERATION";
export type LicenceStatus =
  | "DRAFT"
  | "AWAITING_DEPOSIT"
  | "LICENSED"
  | "ACTIVE"
  | "CLOSED"
  | "SUSPENDED";

export type CompetitionWithLicence = Competition & {
  organisationId: string;
  tier: CompetitionTier;
  licenceStatus: LicenceStatus;
  maxTeams: number | null;
};

export interface CompetitionsQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: CompetitionType;
  country?: string;
  season?: string;
  organisationId?: string;
  sortBy?: "name" | "season" | "startDate" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface CompetitionInput {
  name: string;
  type: CompetitionType;
  season: string;
  country?: string;
  startDate?: string;
  endDate?: string;
  logoUrl?: string;
  organisationId?: string;
}

export async function fetchCompetitions(
  query: CompetitionsQuery = {},
): Promise<PaginatedResult<Competition>> {
  const { data } = await apiClient.get<PaginatedResult<Competition>>("/competitions", {
    params: query,
  });
  return data;
}

export async function fetchCompetitionsForAdmin(
  query: CompetitionsQuery = {},
): Promise<PaginatedResult<Competition>> {
  const { data } = await apiClient.get<PaginatedResult<Competition>>(
    "/competitions/admin/all",
    { params: query },
  );
  return data;
}

export async function fetchCompetitionBySlug(slug: string): Promise<Competition> {
  const { data } = await apiClient.get<Competition>(`/competitions/${slug}`);
  return data;
}

export async function createCompetition(input: CompetitionInput): Promise<Competition> {
  const { data } = await apiClient.post<Competition>("/competitions", input);
  return data;
}

export async function updateCompetition(
  id: string,
  input: Partial<CompetitionInput> & { isActive?: boolean },
): Promise<Competition> {
  const { data } = await apiClient.patch<Competition>(`/competitions/${id}`, input);
  return data;
}

export async function deleteCompetition(id: string): Promise<void> {
  await apiClient.delete(`/competitions/${id}`);
}

// §5 A2/A3 of MONETISATION_UI_BRIEF.md — see the API's
// CompetitionsService.setTier() for why this is its own call rather than
// folded into updateCompetition().
export async function setCompetitionTier(
  id: string,
  tier: CompetitionTier,
): Promise<CompetitionWithLicence> {
  const { data } = await apiClient.patch<CompetitionWithLicence>(
    `/competitions/${id}/tier`,
    { tier },
  );
  return data;
}

export async function fetchCompetitionEntries(
  competitionId: string,
): Promise<CompetitionEntryTeam[]> {
  const { data } = await apiClient.get<CompetitionEntryTeam[]>(
    `/competitions/${competitionId}/teams`,
  );
  return data;
}

export async function addCompetitionEntry(
  competitionId: string,
  teamId: string,
): Promise<CompetitionEntryTeam[]> {
  const { data } = await apiClient.post<CompetitionEntryTeam[]>(
    `/competitions/${competitionId}/teams`,
    { teamId },
  );
  return data;
}

export async function removeCompetitionEntry(
  competitionId: string,
  teamId: string,
): Promise<CompetitionEntryTeam[]> {
  const { data } = await apiClient.delete<CompetitionEntryTeam[]>(
    `/competitions/${competitionId}/teams/${teamId}`,
  );
  return data;
}
