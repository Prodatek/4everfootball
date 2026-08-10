import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import NetInfo from "@react-native-community/netinfo";
import type { MatchEvent } from "@4ef/shared";
import { getDb } from "@/lib/db";
import { recordMatchEvent, type RecordMatchEventInput } from "./api";

export interface QueuedEvent extends RecordMatchEventInput {
  queuedAt: number;
  attempts: number;
  lastError?: string;
}

const RETRY_INTERVAL_MS = 4000;

// After this many consecutive failures, a queued event is treated as
// "stuck" rather than "still syncing" — mirrors web's offline-queue.ts.
export const STUCK_AFTER_ATTEMPTS = 3;

interface PendingRow {
  client_event_id: string;
  fixture_id: string;
  type: string;
  minute: number;
  stoppage_minute: number | null;
  team_id: string | null;
  player_id: string | null;
  assist_player_id: string | null;
  metadata: string | null;
  queued_at: number;
  attempts: number;
  last_error: string | null;
}

function rowToQueuedEvent(row: PendingRow): QueuedEvent {
  return {
    clientEventId: row.client_event_id,
    type: row.type as QueuedEvent["type"],
    minute: row.minute,
    stoppageMinute: row.stoppage_minute ?? undefined,
    teamId: row.team_id ?? undefined,
    playerId: row.player_id ?? undefined,
    assistPlayerId: row.assist_player_id ?? undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    queuedAt: row.queued_at,
    attempts: row.attempts,
    lastError: row.last_error ?? undefined,
  };
}

async function loadQueue(fixtureId: string): Promise<QueuedEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PendingRow>(
    "SELECT * FROM pending_match_events WHERE fixture_id = ? ORDER BY queued_at ASC",
    [fixtureId],
  );
  return rows.map(rowToQueuedEvent);
}

async function insertQueued(fixtureId: string, item: QueuedEvent): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO pending_match_events
      (client_event_id, fixture_id, type, minute, stoppage_minute, team_id, player_id, assist_player_id, metadata, queued_at, attempts, last_error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.clientEventId,
      fixtureId,
      item.type,
      item.minute,
      item.stoppageMinute ?? null,
      item.teamId ?? null,
      item.playerId ?? null,
      item.assistPlayerId ?? null,
      item.metadata ? JSON.stringify(item.metadata) : null,
      item.queuedAt,
      item.attempts,
      item.lastError ?? null,
    ],
  );
}

async function removeQueued(clientEventId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM pending_match_events WHERE client_event_id = ?", [
    clientEventId,
  ]);
}

async function markAttemptFailed(clientEventId: string, message: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE pending_match_events SET attempts = attempts + 1, last_error = ? WHERE client_event_id = ?",
    [message, clientEventId],
  );
}

// The API rejects unknown properties outright, so the local-only bookkeeping
// fields can't ride along in the request body.
function toPayload(item: QueuedEvent): RecordMatchEventInput {
  return {
    clientEventId: item.clientEventId,
    type: item.type,
    minute: item.minute,
    stoppageMinute: item.stoppageMinute,
    teamId: item.teamId,
    playerId: item.playerId,
    assistPlayerId: item.assistPlayerId,
    metadata: item.metadata,
  };
}

function describeError(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(", ") : data.message;
    }
    if (error.response?.status) {
      return `Server rejected this event (${error.response.status})`;
    }
    return "Network error";
  }
  return "Unknown error";
}

/**
 * A scout's tap must never be lost to a dropped connection or a killed app.
 * Events are persisted to SQLite immediately (one row per event, surviving a
 * force-quit mid-match) and drained on an interval — plus immediately on
 * regained connectivity — with a failed POST just leaving the item queued
 * for the next attempt. `clientEventId` makes retries safe: the server
 * treats a resubmitted id as a no-op rather than a duplicate.
 */
export function useOfflineEventQueue(fixtureId: string, onSynced?: (event: MatchEvent) => void) {
  const [queue, setQueue] = useState<QueuedEvent[]>([]);
  const drainingRef = useRef(false);
  const onSyncedRef = useRef(onSynced);

  useEffect(() => {
    onSyncedRef.current = onSynced;
  }, [onSynced]);

  const refresh = useCallback(async () => {
    setQueue(await loadQueue(fixtureId));
  }, [fixtureId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enqueue = useCallback(
    async (input: RecordMatchEventInput) => {
      const item: QueuedEvent = { ...input, queuedAt: Date.now(), attempts: 0 };
      await insertQueued(fixtureId, item);
      await refresh();
    },
    [fixtureId, refresh],
  );

  const drain = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;

    try {
      for (const item of await loadQueue(fixtureId)) {
        try {
          const event = await recordMatchEvent(fixtureId, toPayload(item));
          await removeQueued(item.clientEventId);
          onSyncedRef.current?.(event);
        } catch (error) {
          await markAttemptFailed(item.clientEventId, describeError(error));
        }
      }
    } finally {
      drainingRef.current = false;
      await refresh();
    }
  }, [fixtureId, refresh]);

  useEffect(() => {
    drain();
    const interval = setInterval(drain, RETRY_INTERVAL_MS);
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected) drain();
    });

    return () => {
      clearInterval(interval);
      unsubscribeNetInfo();
    };
  }, [drain]);

  return { pendingEvents: queue, enqueue, pendingCount: queue.length };
}
