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

export async function verifyMatchEvents(fixtureId: string) {
  const { data } = await apiClient.get(`/fixtures/${fixtureId}/verify`);
  return data;
}

// No deleteMatchEvent — match_events is append-only (Phase 1,
// MONETISATION_BUILD_BRIEF.md). This function existed but was never called
// from any UI; DELETE /fixtures/:id/events/:eventId no longer exists on the
// API. A mistake is fixed with a CORRECTION event via recordMatchEvent
// above, not a delete.
