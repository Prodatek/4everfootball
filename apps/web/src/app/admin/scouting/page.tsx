"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-context";
import { fetchFixtures } from "@/features/fixtures/api";

export default function AdminScoutingPage() {
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

  const { data: live } = useQuery({
    queryKey: ["scouting-live"],
    queryFn: () => fetchFixtures({ status: "LIVE", limit: 20, sortBy: "kickoffAt" }),
    enabled: canScout,
    refetchInterval: 30_000,
  });

  const { data: upcoming } = useQuery({
    queryKey: ["scouting-upcoming"],
    queryFn: () =>
      fetchFixtures({
        status: "SCHEDULED",
        limit: 20,
        sortBy: "kickoffAt",
        sortOrder: "asc",
      }),
    enabled: canScout,
  });

  if (isAuthLoading || !canScout) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Live scouting</h1>

      <Card>
        <CardHeader>
          <CardTitle>Live now</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {live && live.data.length === 0 && (
            <p className="text-sm text-muted-foreground">No fixtures live right now.</p>
          )}
          {live?.data.map((fixture) => (
            <Link
              key={fixture.id}
              href={`/scout/fixtures/${fixture.id}`}
              className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted"
            >
              <span className="text-sm font-medium">
                {fixture.homeTeam.name} vs {fixture.awayTeam.name}
              </span>
              <Badge>{fixture.status}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming fixtures</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {upcoming && upcoming.data.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>
          )}
          {upcoming?.data.map((fixture) => (
            <Link
              key={fixture.id}
              href={`/scout/fixtures/${fixture.id}`}
              className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted"
            >
              <span className="text-sm font-medium">
                {fixture.homeTeam.name} vs {fixture.awayTeam.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(fixture.kickoffAt).toLocaleString()}
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
