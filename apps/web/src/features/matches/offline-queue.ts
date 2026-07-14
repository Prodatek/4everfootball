"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MatchEvent } from "@4ef/shared";
import { recordMatchEvent, type RecordMatchEventInput } from "./api";

export interface QueuedEvent extends RecordMatchEventInput {
  queuedAt: number;
}

const RETRY_INTERVAL_MS = 4000;

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

/**
 * A scout's tap must never be lost to a dropped connection. Events are queued
 * to localStorage immediately (surviving a refresh mid-match) and drained on
 * an interval; a failed POST just leaves the item queued for the next tick.
 * `clientEventId` makes retries safe — the server treats a resubmitted id as
 * a no-op rather than a duplicate.
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
      setQueue((prev) => [...prev, { ...input, queuedAt: Date.now() }]);
    },
    [],
  );

  const drain = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;

    try {
      for (const item of loadQueue(fixtureId)) {
        try {
          const event = await recordMatchEvent(fixtureId, item);
          setQueue((prev) => prev.filter((q) => q.clientEventId !== item.clientEventId));
          onSyncedRef.current?.(event);
        } catch {
          // Offline or a transient server error — leave it queued and retry
          // on the next interval tick rather than surfacing an error.
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
