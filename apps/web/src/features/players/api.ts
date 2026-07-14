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

export interface PlayerInput {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  nationality?: string;
  position?: PlayerPosition;
  shirtNumber?: number;
  heightCm?: number;
  preferredFoot?: string;
  photoUrl?: string;
  teamId?: string | null;
}

export async function fetchPlayers(
  query: PlayersQuery = {},
): Promise<PaginatedResult<Player>> {
  const { data } = await apiClient.get<PaginatedResult<Player>>("/players", {
    params: query,
  });
  return data;
}

export async function fetchPlayersForAdmin(
  query: PlayersQuery = {},
): Promise<PaginatedResult<Player>> {
  const { data } = await apiClient.get<PaginatedResult<Player>>("/players/admin/all", {
    params: query,
  });
  return data;
}

export async function fetchPlayerBySlug(slug: string): Promise<Player> {
  const { data } = await apiClient.get<Player>(`/players/${slug}`);
  return data;
}

export async function createPlayer(input: PlayerInput): Promise<Player> {
  const { data } = await apiClient.post<Player>("/players", input);
  return data;
}

export async function updatePlayer(
  id: string,
  input: Partial<PlayerInput> & { isActive?: boolean },
): Promise<Player> {
  const { data } = await apiClient.patch<Player>(`/players/${id}`, input);
  return data;
}

export async function deletePlayer(id: string): Promise<void> {
  await apiClient.delete(`/players/${id}`);
}
