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

export async function fetchCompetitions(
  query: CompetitionsQuery = {},
): Promise<PaginatedResult<Competition>> {
  const { data } = await apiClient.get<PaginatedResult<Competition>>("/competitions", {
    params: query,
  });
  return data;
}

export async function fetchCompetitionBySlug(slug: string): Promise<Competition> {
  const { data } = await apiClient.get<Competition>(`/competitions/${slug}`);
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
