"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DashboardSummary } from "@4ef/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-context";
import { fetchDashboardSummary } from "@/features/dashboard/api";
import { FixtureRow } from "@/features/fixtures/fixture-row";
import { triggerReindex } from "@/features/search/api";

const STAT_CARDS: { key: keyof DashboardSummary["totals"]; label: string }[] = [
  { key: "teams", label: "Teams" },
  { key: "players", label: "Players" },
  { key: "competitions", label: "Competitions" },
  { key: "fixtures", label: "Fixtures" },
  { key: "newsArticles", label: "News articles" },
  { key: "users", label: "Users" },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const isAdmin =
    !!user && (user.roles.includes("ADMIN") || user.roles.includes("SUPER_ADMIN"));

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAuthLoading, isAdmin, router]);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: fetchDashboardSummary,
    enabled: isAdmin,
  });

  const reindexMutation = useMutation({
    mutationFn: triggerReindex,
    onSuccess: (result) => {
      toast.success(
        `Reindexed ${result.teams} teams, ${result.players} players, ${result.competitions} competitions, ${result.news} news articles`,
      );
    },
    onError: () => toast.error("Failed to reindex search"),
  });

  if (isAuthLoading || !isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button
          variant="outline"
          size="sm"
          disabled={reindexMutation.isPending}
          onClick={() => reindexMutation.mutate()}
        >
          {reindexMutation.isPending ? "Reindexing..." : "Reindex search"}
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading summary...</p>}

      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {STAT_CARDS.map(({ key, label }) => (
            <Card key={key}>
              <CardContent className="flex flex-col gap-1 p-4">
                <p className="text-2xl font-semibold">{summary.totals[key]}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {summary && summary.liveFixtures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Live now</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {summary.liveFixtures.map((fixture) => (
              <FixtureRow key={fixture.id} fixture={fixture} />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upcoming fixtures</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {summary && summary.upcomingFixtures.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>
          )}
          {summary?.upcomingFixtures.map((fixture) => (
            <FixtureRow key={fixture.id} fixture={fixture} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
