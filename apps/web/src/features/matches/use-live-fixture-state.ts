import { useEffect, useState } from "react";
import type { MatchLiveState } from "@4ef/shared";
import { fetchLiveState } from "./api";
import { getLiveSocket } from "@/lib/live-socket";

// State-only sibling of useLiveMatch, for compact multi-fixture views (e.g.
// a live-scores list) that don't need the full event timeline — skips
// fetchMatchEvents and the match-event/match-event-removed listeners.
export function useLiveFixtureState(fixtureId: string) {
  const [liveState, setLiveState] = useState<MatchLiveState | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchLiveState(fixtureId)
      .then((initialState) => {
        if (!cancelled) setLiveState(initialState);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [fixtureId]);

  useEffect(() => {
    const socket = getLiveSocket();
    socket.emit("join-fixture", fixtureId);

    function onState(state: MatchLiveState) {
      setLiveState(state);
    }

    socket.on("match-state", onState);

    return () => {
      socket.off("match-state", onState);
      socket.emit("leave-fixture", fixtureId);
    };
  }, [fixtureId]);

  return liveState;
}
