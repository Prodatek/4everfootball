import type { Fixture, FixtureStatus, PaginatedResult } from "@4ef/shared";
import { apiClient } from "@/lib/api-client";

export interface FixturesQuery {
  page?: number;
  limit?: number;
  competitionId?: string;
  teamId?: string;
  status?: FixtureStatus;
  fromDate?: string;
  toDate?: string;
  sortBy?: "kickoffAt" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface FixtureInput {
  competitionId: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffAt: string;
  venueName?: string;
  matchday?: string;
}

export interface FixtureUpdateInput {
  kickoffAt?: string;
  venueName?: string;
  matchday?: string;
  status?: FixtureStatus;
  homeScore?: number;
  awayScore?: number;
}

export async function fetchFixtures(
  query: FixturesQuery = {},
): Promise<PaginatedResult<Fixture>> {
  const { data } = await apiClient.get<PaginatedResult<Fixture>>("/fixtures", {
    params: query,
  });
  return data;
}

export async function fetchFixtureById(id: string): Promise<Fixture> {
  const { data } = await apiClient.get<Fixture>(`/fixtures/${id}`);
  return data;
}

export async function createFixture(input: FixtureInput): Promise<Fixture> {
  const { data } = await apiClient.post<Fixture>("/fixtures", input);
  return data;
}

export async function updateFixture(
  id: string,
  input: FixtureUpdateInput,
): Promise<Fixture> {
  const { data } = await apiClient.patch<Fixture>(`/fixtures/${id}`, input);
  return data;
}

export async function deleteFixture(id: string): Promise<void> {
  await apiClient.delete(`/fixtures/${id}`);
}
