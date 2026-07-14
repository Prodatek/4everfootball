import { useEffect, useState } from "react";
import type { MatchEvent, MatchLiveState } from "@4ef/shared";
import { fetchLiveState, fetchMatchEvents } from "./api";
import { getLiveSocket } from "@/lib/live-socket";

export function useLiveMatch(fixtureId: string) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [liveState, setLiveState] = useState<MatchLiveState | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchMatchEvents(fixtureId), fetchLiveState(fixtureId)])
      .then(([initialEvents, initialState]) => {
        if (!cancelled) {
          setEvents(initialEvents);
          setLiveState(initialState);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [fixtureId]);

  useEffect(() => {
    const socket = getLiveSocket();
    socket.emit("join-fixture", fixtureId);

    function onEvent(event: MatchEvent) {
      setEvents((prev) => (prev.some((e) => e.id === event.id) ? prev : [...prev, event]));
    }

    function onEventRemoved({ eventId }: { eventId: string }) {
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    }

    function onState(state: MatchLiveState) {
      setLiveState(state);
    }

    socket.on("match-event", onEvent);
    socket.on("match-event-removed", onEventRemoved);
    socket.on("match-state", onState);

    return () => {
      socket.off("match-event", onEvent);
      socket.off("match-event-removed", onEventRemoved);
      socket.off("match-state", onState);
    };
  }, [fixtureId]);

  return { events, liveState };
}
