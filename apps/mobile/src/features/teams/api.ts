import type { PaginatedResult, Team } from "@4ef/shared";
import { apiClient } from "@/lib/api-client";

export interface TeamsQuery {
  page?: number;
  limit?: number;
  search?: string;
  country?: string;
  sortBy?: "name" | "foundedYear" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export async function fetchTeams(query: TeamsQuery = {}): Promise<PaginatedResult<Team>> {
  const { data } = await apiClient.get<PaginatedResult<Team>>("/teams", {
    params: query,
  });
  return data;
}

export async function fetchTeamBySlug(slug: string): Promise<Team> {
  const { data } = await apiClient.get<Team>(`/teams/${slug}`);
  return data;
}
