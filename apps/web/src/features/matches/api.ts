import type { MatchEvent, MatchEventType, MatchLiveState } from "@4ef/shared";
import { apiClient } from "@/lib/api-client";

export async function fetchMatchEvents(fixtureId: string): Promise<MatchEvent[]> {
  const { data } = await apiClient.get<MatchEvent[]>(`/fixtures/${fixtureId}/events`);
  return data;
}

export async function fetchLiveState(fixtureId: string): Promise<MatchLiveState> {
  const { data } = await apiClient.get<MatchLiveState>(
    `/fixtures/${fixtureId}/live-state`,
  );
  return data;
}

export interface RecordMatchEventInput {
  clientEventId: string;
  type: MatchEventType;
  minute: number;
  stoppageMinute?: number;
  teamId?: string;
  playerId?: string;
  assistPlayerId?: string;
  metadata?: Record<string, unknown>;
}

export async function recordMatchEvent(
  fixtureId: string,
  input: RecordMatchEventInput,
): Promise<MatchEvent> {
  const { data } = await apiClient.post<MatchEvent>(
    `/fixtures/${fixtureId}/events`,
    input,
  );
  return data;
}

export async function deleteMatchEvent(fixtureId: string, eventId: string): Promise<void> {
  await apiClient.delete(`/fixtures/${fixtureId}/events/${eventId}`);
}
