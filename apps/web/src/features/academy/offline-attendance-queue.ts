"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { recordAttendance, type AcademyAttendance, type RecordAttendanceInput } from "./api";

export interface QueuedAttendance extends RecordAttendanceInput {
  queuedAt: number;
  attempts: number;
  lastError?: string;
}

const RETRY_INTERVAL_MS = 4000;
export const STUCK_AFTER_ATTEMPTS = 3;

function storageKey(organisationId: string): string {
  return `4ef:academy-attendance-queue:${organisationId}`;
}

function loadQueue(organisationId: string): QueuedAttendance[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(organisationId));
    return raw ? (JSON.parse(raw) as QueuedAttendance[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(organisationId: string, queue: QueuedAttendance[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(organisationId), JSON.stringify(queue));
}

// The API rejects unknown properties outright (forbidNonWhitelisted), so
// the local-only bookkeeping fields (queuedAt/attempts/lastError) can't
// ride along in the request body — same fix as offline-queue.ts's
// toPayload(), which exists precisely because omitting this step used to
// fail every single submission with "property queuedAt should not exist".
function toPayload(item: QueuedAttendance): RecordAttendanceInput {
  return {
    clientEventId: item.clientEventId,
    ageGroupId: item.ageGroupId,
    playerId: item.playerId,
    date: item.date,
    status: item.status,
  };
}

function describeError(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(", ") : data.message;
    }
    if (error.response?.status) {
      return `Server rejected this tap (${error.response.status})`;
    }
    return "Network error";
  }
  return "Unknown error";
}

/**
 * §5 F3: "works offline, same sync pattern as match capture" — direct port
 * of features/matches/offline-queue.ts's shape (queue-to-localStorage,
 * 4s drain, clientEventId idempotency) for a coach's attendance taps
 * instead of a scout's match events.
 */
export function useOfflineAttendanceQueue(
  organisationId: string,
  onSynced?: (record: AcademyAttendance) => void,
) {
  const [queue, setQueue] = useState<QueuedAttendance[]>(() => loadQueue(organisationId));
  const drainingRef = useRef(false);
  const onSyncedRef = useRef(onSynced);

  useEffect(() => {
    onSyncedRef.current = onSynced;
  }, [onSynced]);

  useEffect(() => {
    saveQueue(organisationId, queue);
  }, [organisationId, queue]);

  const enqueue = useCallback((input: RecordAttendanceInput) => {
    setQueue((prev) => [...prev, { ...input, queuedAt: Date.now(), attempts: 0 }]);
  }, []);

  const drain = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;

    try {
      for (const item of loadQueue(organisationId)) {
        try {
          const record = await recordAttendance(organisationId, toPayload(item));
          setQueue((prev) => prev.filter((q) => q.clientEventId !== item.clientEventId));
          onSyncedRef.current?.(record);
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
  }, [organisationId]);

  useEffect(() => {
    drain();
    const interval = setInterval(drain, RETRY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [drain]);

  return {
    pendingRecords: queue,
    enqueue,
    pendingCount: queue.length,
    syncNow: drain,
  };
}
