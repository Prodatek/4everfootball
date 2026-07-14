"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ALL_MATCH_EVENT_TYPES, type MatchEventType } from "@4ef/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-context";
import { fetchFixtureById } from "@/features/fixtures/api";
import { fetchPlayers } from "@/features/players/api";
import { useLiveMatch } from "@/features/matches/use-live-match";
import { useOfflineEventQueue } from "@/features/matches/offline-queue";
import { MatchTimeline } from "@/features/matches/match-timeline";
import { MATCH_EVENT_LABELS } from "@/features/matches/event-labels";
import { RecordEventDialog } from "@/features/matches/record-event-dialog";

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
  const { pendingEvents, enqueue, pendingCount } = useOfflineEventQueue(id);

  const [dialogEventType, setDialogEventType] = useState<MatchEventType | null>(null);
  const [dialogMinute, setDialogMinute] = useState(0);
  const [dialogKey, setDialogKey] = useState(0);

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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
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
        {pendingCount > 0 && (
          <CardContent className="text-sm text-muted-foreground">
            {pendingCount} event{pendingCount === 1 ? "" : "s"} pending sync...
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {ALL_MATCH_EVENT_TYPES.map((type) => (
          <Button
            key={type}
            variant="outline"
            className="h-16 whitespace-normal text-sm"
            onClick={() => {
              const minute =
                status === "LIVE"
                  ? Math.max(
                      1,
                      Math.floor((Date.now() - new Date(kickoffAt).getTime()) / 60_000),
                    )
                  : 0;
              setDialogMinute(minute);
              setDialogEventType(type);
              setDialogKey((key) => key + 1);
            }}
          >
            {MATCH_EVENT_LABELS[type]}
          </Button>
        ))}
      </div>

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
                  <span className="italic">syncing...</span>
                </li>
              ))}
            </ul>
          )}
          <MatchTimeline events={events} />
        </CardContent>
      </Card>

      <RecordEventDialog
        key={dialogKey}
        open={dialogEventType !== null}
        onOpenChange={(open) => {
          if (!open) setDialogEventType(null);
        }}
        eventType={dialogEventType}
        homeTeam={{ id: fixture.homeTeamId, name: fixture.homeTeam.name }}
        awayTeam={{ id: fixture.awayTeamId, name: fixture.awayTeam.name }}
        squads={squads}
        defaultMinute={dialogMinute}
        onConfirm={enqueue}
      />
    </div>
  );
}
