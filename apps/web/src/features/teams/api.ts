import type { PaginatedResult, Team } from "@4ef/shared";
import { apiClient } from "@/lib/api-client";

// @4ef/shared's Team type predates organisationId (Phase 2) — present on
// the wire, untyped there. See the same note on CompetitionWithLicence.
export type TeamWithOrganisation = Team & { organisationId: string | null };

export interface TeamsQuery {
  page?: number;
  limit?: number;
  search?: string;
  country?: string;
  unclaimed?: boolean;
  sortBy?: "name" | "foundedYear" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface TeamInput {
  name: string;
  shortName?: string;
  country?: string;
  foundedYear?: number;
  logoUrl?: string;
  venueName?: string;
}

export async function fetchTeams(query: TeamsQuery = {}): Promise<PaginatedResult<Team>> {
  const { data } = await apiClient.get<PaginatedResult<Team>>("/teams", {
    params: query,
  });
  return data;
}

export async function fetchTeamsForAdmin(
  query: TeamsQuery = {},
): Promise<PaginatedResult<Team>> {
  const { data } = await apiClient.get<PaginatedResult<Team>>("/teams/admin/all", {
    params: query,
  });
  return data;
}

export async function fetchTeamBySlug(slug: string): Promise<Team> {
  const { data } = await apiClient.get<Team>(`/teams/${slug}`);
  return data;
}

export async function createTeam(input: TeamInput): Promise<Team> {
  const { data } = await apiClient.post<Team>("/teams", input);
  return data;
}

export async function updateTeam(id: string, input: Partial<TeamInput> & { isActive?: boolean }): Promise<Team> {
  const { data } = await apiClient.patch<Team>(`/teams/${id}`, input);
  return data;
}

export async function deleteTeam(id: string): Promise<void> {
  await apiClient.delete(`/teams/${id}`);
}

export async function claimTeam(teamId: string, organisationId: string): Promise<Team> {
  const { data } = await apiClient.post<Team>(`/teams/${teamId}/claim`, { organisationId });
  return data;
}
