import type { PaginatedResult, Player, PlayerPosition } from "@4ef/shared";
import { apiClient } from "@/lib/api-client";

export interface PlayersQuery {
  page?: number;
  limit?: number;
  search?: string;
  teamId?: string;
  position?: PlayerPosition;
  nationality?: string;
  sortBy?: "firstName" | "lastName" | "shirtNumber" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export async function fetchPlayers(
  query: PlayersQuery = {},
): Promise<PaginatedResult<Player>> {
  const { data } = await apiClient.get<PaginatedResult<Player>>("/players", {
    params: query,
  });
  return data;
}

export async function fetchPlayerBySlug(slug: string): Promise<Player> {
  const { data } = await apiClient.get<Player>(`/players/${slug}`);
  return data;
}
