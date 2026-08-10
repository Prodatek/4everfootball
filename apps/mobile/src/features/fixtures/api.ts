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
