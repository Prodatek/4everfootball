"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Fixture } from "@4ef/shared";
import { Badge } from "@/components/ui/badge";
import { useLiveFixtureState } from "@/features/matches/use-live-fixture-state";

const CLOCK_TICK_MS = 15_000;

// Elapsed-since-kickoff clock, computed client-side (no server-pushed match
// clock exists) — exact for auto-started fixtures, doesn't pause at
// half-time since this system has no half-time status to pause on.
export function LiveScoreCard({ fixture }: { fixture: Fixture }) {
  const liveState = useLiveFixtureState(fixture.id);
  const [minute, setMinute] = useState<number | null>(null);

  useEffect(() => {
    const kickoffMs = new Date(fixture.kickoffAt).getTime();

    function tick() {
      setMinute(Math.max(0, Math.floor((Date.now() - kickoffMs) / 60_000)));
    }

    tick();
    const interval = setInterval(tick, CLOCK_TICK_MS);
    return () => clearInterval(interval);
  }, [fixture.kickoffAt]);

  const homeScore = liveState?.homeScore ?? fixture.homeScore ?? 0;
  const awayScore = liveState?.awayScore ?? fixture.awayScore ?? 0;

  return (
    <Link
      href={`/fixtures/${fixture.id}`}
      className="flex items-center justify-between gap-4 rounded-md border px-4 py-3 hover:bg-muted"
    >
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">
          {fixture.homeTeam.name} vs {fixture.awayTeam.name}
        </span>
        <span className="text-xs text-muted-foreground">{fixture.competition.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">
          {homeScore} - {awayScore}
        </span>
        <Badge variant="default" className="animate-pulse">
          {minute !== null ? `${minute}'` : "LIVE"}
        </Badge>
      </div>
    </Link>
  );
}
