import type { StandingRow } from "@4ef/shared";
import { apiClient } from "@/lib/api-client";

export async function fetchStandings(competitionId: string): Promise<StandingRow[]> {
  const { data } = await apiClient.get<StandingRow[]>(
    `/competitions/${competitionId}/table`,
  );
  return data;
}
