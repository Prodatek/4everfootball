"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import type { MatchEvent } from "@4ef/shared";
import { recordMatchEvent, type RecordMatchEventInput } from "./api";

export interface QueuedEvent extends RecordMatchEventInput {
  queuedAt: number;
  attempts: number;
  lastError?: string;
}

const RETRY_INTERVAL_MS = 4000;

// After this many consecutive failures, a queued event is treated as
// "stuck" rather than "still syncing" — see STUCK_AFTER_ATTEMPTS usage below.
export const STUCK_AFTER_ATTEMPTS = 3;

function storageKey(fixtureId: string): string {
  return `4ef:scout-queue:${fixtureId}`;
}

function loadQueue(fixtureId: string): QueuedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(fixtureId));
    return raw ? (JSON.parse(raw) as QueuedEvent[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(fixtureId: string, queue: QueuedEvent[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(fixtureId), JSON.stringify(queue));
}

// The API rejects unknown properties outright, so the local-only bookkeeping
// fields (queuedAt/attempts/lastError) can't ride along in the request body.
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
 * A scout's tap must never be lost to a dropped connection. Events are queued
 * to localStorage immediately (surviving a refresh mid-match) and drained on
 * an interval; a failed POST just leaves the item queued for the next tick.
 * `clientEventId` makes retries safe — the server treats a resubmitted id as
 * a no-op rather than a duplicate. Local-only bookkeeping fields (`queuedAt`,
 * `attempts`, `lastError`) are stripped before the request is sent — the API
 * rejects unknown properties outright, which used to make every single event
 * fail with "property queuedAt should not exist".
 */
export function useOfflineEventQueue(fixtureId: string, onSynced?: (event: MatchEvent) => void) {
  const [queue, setQueue] = useState<QueuedEvent[]>(() => loadQueue(fixtureId));
  const drainingRef = useRef(false);
  const onSyncedRef = useRef(onSynced);

  useEffect(() => {
    onSyncedRef.current = onSynced;
  }, [onSynced]);

  useEffect(() => {
    saveQueue(fixtureId, queue);
  }, [fixtureId, queue]);

  const enqueue = useCallback(
    (input: RecordMatchEventInput) => {
      setQueue((prev) => [...prev, { ...input, queuedAt: Date.now(), attempts: 0 }]);
    },
    [],
  );

  const drain = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;

    try {
      for (const item of loadQueue(fixtureId)) {
        try {
          const event = await recordMatchEvent(fixtureId, toPayload(item));
          setQueue((prev) => prev.filter((q) => q.clientEventId !== item.clientEventId));
          onSyncedRef.current?.(event);
        } catch (error) {
          const message = describeError(error);
          setQueue((prev) =>
            prev.map((q) =>
              q.clientEventId === item.clientEventId
                ? { ...q, attempts: q.attempts + 1, lastError: message }
                : q,
            ),
          );
        }
      }
    } finally {
      drainingRef.current = false;
    }
  }, [fixtureId]);

  useEffect(() => {
    drain();
    const interval = setInterval(drain, RETRY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [drain]);

  return { pendingEvents: queue, enqueue, pendingCount: queue.length };
}
