import type { LeaderboardRow, PlayerStatsSummary, TeamForm } from "@4ef/shared";
import { apiClient } from "@/lib/api-client";

export async function fetchTopScorers(competitionId: string): Promise<LeaderboardRow[]> {
  const { data } = await apiClient.get<LeaderboardRow[]>(
    `/competitions/${competitionId}/top-scorers`,
  );
  return data;
}

export async function fetchTopAssists(competitionId: string): Promise<LeaderboardRow[]> {
  const { data } = await apiClient.get<LeaderboardRow[]>(
    `/competitions/${competitionId}/top-assists`,
  );
  return data;
}

export async function fetchPlayerStats(
  slug: string,
  competitionId?: string,
): Promise<PlayerStatsSummary> {
  const { data } = await apiClient.get<PlayerStatsSummary>(`/players/${slug}/stats`, {
    params: competitionId ? { competitionId } : undefined,
  });
  return data;
}

export async function fetchCompetitionForm(competitionId: string): Promise<TeamForm[]> {
  const { data } = await apiClient.get<TeamForm[]>(`/competitions/${competitionId}/form`);
  return data;
}
