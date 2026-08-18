"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type { MatchEvent, MatchEventType } from "@4ef/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-context";
import { fetchFixtureById } from "@/features/fixtures/api";
import { fetchPlayers } from "@/features/players/api";
import { useLiveMatch } from "@/features/matches/use-live-match";
import { STUCK_AFTER_ATTEMPTS, useOfflineEventQueue } from "@/features/matches/offline-queue";
import { MatchTimeline } from "@/features/matches/match-timeline";
import { MATCH_EVENT_LABELS } from "@/features/matches/event-labels";
import { EventCapturePanel } from "@/features/matches/event-capture-panel";
import { CorrectionPanel } from "@/features/matches/correction-panel";
import { SyncStatusIndicator } from "@/features/matches/sync-status-indicator";

// Brief §5 C2: "primary actions immediately reachable: goal, card,
// substitution, period control" — everything else demoted to a
// collapsed secondary section instead of 19 equal-weight buttons.
const PRIMARY_EVENTS: MatchEventType[] = ["GOAL", "YELLOW_CARD", "RED_CARD", "SUBSTITUTION"];
const PERIOD_EVENTS: MatchEventType[] = ["KICKOFF", "HALF_TIME", "FULL_TIME"];
const SECONDARY_EVENTS: MatchEventType[] = [
  "SHOT",
  "SHOT_ON_TARGET",
  "SHOT_OFF_TARGET",
  "SAVE",
  "CORNER",
  "FREE_KICK",
  "THROW_IN",
  "PENALTY_AWARDED",
  "PENALTY_SCORED",
  "PENALTY_MISSED",
  "INJURY",
  "VAR_DECISION",
  "OFFSIDE",
];

export default function ScoutFixturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const canScout =
    !!user &&
    (user.roles.includes("SCOUT") ||
      user.roles.includes("ADMIN") ||
      user.roles.includes("SUPER_ADMIN"));

  useEffect(() => {
    if (!isAuthLoading && !canScout) {
      router.replace("/dashboard");
    }
  }, [isAuthLoading, canScout, router]);

  const { data: fixture } = useQuery({
    queryKey: ["fixture", id],
    queryFn: () => fetchFixtureById(id),
    enabled: canScout,
  });

  const { data: homeSquad } = useQuery({
    queryKey: ["team-squad", fixture?.homeTeamId],
    queryFn: () => fetchPlayers({ teamId: fixture!.homeTeamId, limit: 50 }),
    enabled: !!fixture,
  });

  const { data: awaySquad } = useQuery({
    queryKey: ["team-squad", fixture?.awayTeamId],
    queryFn: () => fetchPlayers({ teamId: fixture!.awayTeamId, limit: 50 }),
    enabled: !!fixture,
  });

  const { events, liveState } = useLiveMatch(id);
  const { pendingEvents, enqueue, pendingCount, syncNow } = useOfflineEventQueue(id);

  // Only ever one of these two panels is open at a time — tapping any
  // primary/secondary button, or "Correct" on a timeline row, replaces
  // whichever was open. Neither is a modal, so this is a UX choice
  // ("the newest tap wins"), not an accessibility constraint.
  const [capture, setCapture] = useState<{ type: MatchEventType; teamId?: string } | null>(null);
  const [captureKey, setCaptureKey] = useState(0);
  const [correcting, setCorrecting] = useState<MatchEvent | null>(null);
  const [showMore, setShowMore] = useState(false);

  function openCapture(next: { type: MatchEventType; teamId?: string }) {
    setCorrecting(null);
    setCapture(next);
    setCaptureKey((k) => k + 1);
  }

  const squads = useMemo(
    () => ({
      ...(fixture ? { [fixture.homeTeamId]: homeSquad?.data ?? [] } : {}),
      ...(fixture ? { [fixture.awayTeamId]: awaySquad?.data ?? [] } : {}),
    }),
    [fixture, homeSquad, awaySquad],
  );

  if (isAuthLoading || !canScout || !fixture) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  const status = liveState?.status ?? fixture.status;
  const homeScore = liveState?.homeScore ?? fixture.homeScore;
  const awayScore = liveState?.awayScore ?? fixture.awayScore;
  const kickoffAt = fixture.kickoffAt;

  function computeMinute(): number {
    return status === "LIVE"
      ? Math.max(1, Math.floor((Date.now() - new Date(kickoffAt).getTime()) / 60_000))
      : 0;
  }

  function tapPeriodEvent(type: MatchEventType) {
    // No team, no player — nothing to fill in, so this is genuinely
    // one-tap (brief §5 C2: "immediately reachable"), not routed through
    // the capture panel at all.
    enqueue({ clientEventId: crypto.randomUUID(), type, minute: computeMinute() });
    toast.success(MATCH_EVENT_LABELS[type]);
  }

  const stuckCount = pendingEvents.filter((e) => e.attempts >= STUCK_AFTER_ATTEMPTS).length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 pb-72">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>
              {fixture.homeTeam.name} {homeScore ?? "-"} : {awayScore ?? "-"}{" "}
              {fixture.awayTeam.name}
            </span>
            <Badge variant={status === "LIVE" ? "default" : "secondary"}>{status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SyncStatusIndicator pendingCount={pendingCount} stuckCount={stuckCount} onSyncNow={syncNow} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {[fixture.homeTeam, fixture.awayTeam].map((team, i) => {
          const teamId = i === 0 ? fixture.homeTeamId : fixture.awayTeamId;
          return (
            <div key={team.id} className="flex flex-col gap-2">
              <p className="truncate text-center text-sm font-medium text-muted-foreground">
                {team.name}
              </p>
              {PRIMARY_EVENTS.map((type) => (
                <Button
                  key={type}
                  variant={type === "RED_CARD" ? "destructive" : "outline"}
                  className="h-16 text-sm font-medium"
                  onClick={() => openCapture({ type, teamId })}
                >
                  {MATCH_EVENT_LABELS[type]}
                </Button>
              ))}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Period</p>
        <div className="grid grid-cols-3 gap-2">
          {PERIOD_EVENTS.map((type) => (
            <Button
              key={type}
              variant="secondary"
              className="h-12"
              onClick={() => tapPeriodEvent(type)}
            >
              {MATCH_EVENT_LABELS[type]}
            </Button>
          ))}
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-fit"
        onClick={() => setShowMore((v) => !v)}
      >
        <ChevronDown className={`size-4 transition-transform ${showMore ? "rotate-180" : ""}`} />
        More events
      </Button>

      {showMore && (
        <div className="grid grid-cols-3 gap-2">
          {SECONDARY_EVENTS.map((type) => (
            <Button
              key={type}
              variant="outline"
              className="h-12 whitespace-normal text-xs"
              onClick={() => openCapture({ type })}
            >
              {MATCH_EVENT_LABELS[type]}
            </Button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {pendingEvents.length > 0 && (
            <ul className="flex flex-col gap-1">
              {pendingEvents.map((item) => (
                <li
                  key={item.clientEventId}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="font-mono">{item.minute}&apos;</span>
                  <span>{MATCH_EVENT_LABELS[item.type]}</span>
                  {item.attempts >= STUCK_AFTER_ATTEMPTS && item.lastError ? (
                    <span className="italic text-destructive">{item.lastError}</span>
                  ) : (
                    <span className="italic">syncing...</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <MatchTimeline
            events={events}
            onCorrect={(event) => {
              setCapture(null);
              setCorrecting(event);
            }}
          />
        </CardContent>
      </Card>

      {capture && (
        <EventCapturePanel
          key={captureKey}
          eventType={capture.type}
          presetTeamId={capture.teamId}
          homeTeam={{ id: fixture.homeTeamId, name: fixture.homeTeam.name }}
          awayTeam={{ id: fixture.awayTeamId, name: fixture.awayTeam.name }}
          squads={squads}
          defaultMinute={computeMinute()}
          onConfirm={(input) => {
            enqueue(input);
            toast.success(MATCH_EVENT_LABELS[capture.type]);
          }}
          onDismiss={() => setCapture(null)}
        />
      )}

      {correcting && (
        <CorrectionPanel
          event={correcting}
          onConfirm={(input) => {
            enqueue(input);
            toast.success("Correction filed");
          }}
          onDismiss={() => setCorrecting(null)}
        />
      )}
    </div>
  );
}
