"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchFixtures } from "@/features/fixtures/api";
import { FixtureRow } from "@/features/fixtures/fixture-row";
import { LiveScoreCard } from "@/features/fixtures/live-score-card";

const LIST_REFETCH_MS = 30_000;

export default function LivePage() {
  const { data: liveData, isLoading: isLiveLoading } = useQuery({
    queryKey: ["live-fixtures"],
    queryFn: () =>
      fetchFixtures({
        status: "LIVE",
        sortBy: "kickoffAt",
        sortOrder: "asc",
        limit: 50,
      }),
    refetchInterval: LIST_REFETCH_MS,
  });

  const { data: upcomingData, isLoading: isUpcomingLoading } = useQuery({
    queryKey: ["upcoming-fixtures-24h"],
    queryFn: () => {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      return fetchFixtures({
        status: "SCHEDULED",
        fromDate: now.toISOString(),
        toDate: in24h.toISOString(),
        sortBy: "kickoffAt",
        sortOrder: "asc",
        limit: 50,
      });
    },
    refetchInterval: LIST_REFETCH_MS,
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold">Live Scores</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Live now</h2>
        {isLiveLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {liveData && liveData.data.length === 0 && (
          <p className="text-sm text-muted-foreground">No matches live right now.</p>
        )}
        <div className="flex flex-col gap-2">
          {liveData?.data.map((fixture) => (
            <LiveScoreCard key={fixture.id} fixture={fixture} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Upcoming (next 24 hours)</h2>
        {isUpcomingLoading && (
          <p className="text-sm text-muted-foreground">Loading...</p>
        )}
        {upcomingData && upcomingData.data.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing kicking off soon.</p>
        )}
        <div className="flex flex-col gap-2">
          {upcomingData?.data.map((fixture) => (
            <FixtureRow key={fixture.id} fixture={fixture} />
          ))}
        </div>
      </section>
    </div>
  );
}
