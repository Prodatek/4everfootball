"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";
import type { Fixture } from "@4ef/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/layout/container";
import { useAuth } from "@/features/auth/auth-context";
import { fetchFixtures } from "@/features/fixtures/api";
import { loadCachedFixtures, saveCachedFixtures } from "@/features/matches/fixture-list-cache";
import { useOnlineStatus } from "@/features/matches/use-online-status";

export default function ScoutFixtureListPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const isOnline = useOnlineStatus();
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

  const [cached, setCached] = useState<Fixture[] | null>(() => loadCachedFixtures());

  // §5 C1: "assigned fixtures" — there's no fixture-assignment concept in
  // this backend yet (any SCOUT/ADMIN/SUPER_ADMIN can record on any
  // fixture today), so this lists every fixture a scout can actually act
  // on: everything not yet finished. Not a permissions change, just what
  // the list is scoped to given today's real access.
  const { data: live, isLoading: liveLoading } = useQuery({
    queryKey: ["scout-fixtures", "LIVE"],
    queryFn: () => fetchFixtures({ status: "LIVE", limit: 50, sortBy: "kickoffAt", sortOrder: "asc" }),
    enabled: canScout && isOnline,
  });

  const { data: scheduled, isLoading: scheduledLoading } = useQuery({
    queryKey: ["scout-fixtures", "SCHEDULED"],
    queryFn: () =>
      fetchFixtures({ status: "SCHEDULED", limit: 50, sortBy: "kickoffAt", sortOrder: "asc" }),
    enabled: canScout && isOnline,
  });

  const fixtures = useMemo(() => {
    if (live && scheduled) return [...live.data, ...scheduled.data];
    return null;
  }, [live, scheduled]);

  useEffect(() => {
    if (fixtures) saveCachedFixtures(fixtures);
  }, [fixtures]);

  const isLoading = liveLoading || scheduledLoading;
  const shown = fixtures ?? cached;

  useEffect(() => {
    if (cached === null && fixtures) setCached(fixtures);
  }, [cached, fixtures]);

  if (isAuthLoading || !canScout) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-4 py-6">
      <h1 className="font-heading text-2xl uppercase">Your fixtures</h1>

      {!isOnline && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          <WifiOff className="size-4 shrink-0" />
          {shown && shown.length > 0
            ? "Offline — showing your last downloaded list. Some details may be out of date."
            : "Offline — connect to load your fixtures."}
        </div>
      )}

      {isOnline && isLoading && !cached && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))}
        </div>
      )}

      {shown && shown.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No live or upcoming fixtures right now.
        </p>
      )}

      {shown && shown.length > 0 && (
        <div className="flex flex-col gap-2">
          {shown.map((fixture) => (
            <Link key={fixture.id} href={`/scout/fixtures/${fixture.id}`}>
              <Card size="sm" className="hover:bg-muted/50">
                <CardContent className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <p className="font-medium">
                      {fixture.homeTeam.name} vs {fixture.awayTeam.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(fixture.kickoffAt).toLocaleString("en-NG", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Badge variant={fixture.status === "LIVE" ? "default" : "secondary"}>
                    {fixture.status}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
