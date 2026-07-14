import type {
  Competition,
  CompetitionEntryTeam,
  CompetitionType,
  PaginatedResult,
} from "@4ef/shared";
import { apiClient } from "@/lib/api-client";

export interface CompetitionsQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: CompetitionType;
  country?: string;
  season?: string;
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
