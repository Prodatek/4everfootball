"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Radio, ShieldCheck, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/layout/container";
import { fetchFixtures } from "@/features/fixtures/api";
import { LiveScoreCard } from "@/features/fixtures/live-score-card";
import { FixtureRow } from "@/features/fixtures/fixture-row";

const FEATURES = [
  {
    icon: Radio,
    title: "Real-time everything",
    description: "Live scores and match events update the moment they happen, no refresh needed.",
  },
  {
    icon: CalendarClock,
    title: "Kickoff, automatically",
    description: "Fixtures go live on the clock — no scout has to remember to start the match.",
  },
  {
    icon: Trophy,
    title: "Teams, players & competitions",
    description: "Everything about a season lives in one connected, searchable platform.",
  },
  {
    icon: ShieldCheck,
    title: "An honest record",
    description: "Every event is logged to the timeline and auditable — never hand-edited.",
  },
];

export default function Home() {
  const { data: liveData, isLoading: isLiveLoading } = useQuery({
    queryKey: ["home-live-fixtures"],
    queryFn: () =>
      fetchFixtures({ status: "LIVE", sortBy: "kickoffAt", sortOrder: "asc", limit: 3 }),
    refetchInterval: 30_000,
  });

  const { data: upcomingData, isLoading: isUpcomingLoading } = useQuery({
    queryKey: ["home-upcoming-fixtures"],
    queryFn: () =>
      fetchFixtures({ status: "SCHEDULED", sortBy: "kickoffAt", sortOrder: "asc", limit: 3 }),
    enabled: !isLiveLoading && (liveData?.data.length ?? 0) === 0,
  });

  const liveCount = liveData?.data.length ?? 0;
  const showUpcoming = liveCount === 0;

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-center py-16 lg:py-24">
          <Container size="lg" className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-live">
              <span className="size-1.5 animate-pulse rounded-full bg-live" />
              {isLiveLoading
                ? "Checking for live matches…"
                : liveCount > 0
                  ? `Live now — ${liveCount} match${liveCount === 1 ? "" : "es"}`
                  : "No matches live right now"}
            </span>
            <h1 className="text-balance font-display text-5xl uppercase leading-[0.95] tracking-wide sm:text-6xl lg:text-7xl">
              Ninety minutes.
              <br />
              <span className="text-primary">Zero delay.</span>
            </h1>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              Every kickoff, goal, and final whistle — streamed from the touchline straight to
              your feed, the instant it happens.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" render={<Link href="/register" />}>
                Get started
              </Button>
              <Button size="lg" variant="outline" render={<Link href="/live" />}>
                Live scores
              </Button>
            </div>
          </Container>
        </div>

        {/* Floodlight panel — atmospheric CSS treatment standing in for match
            photography (none was supplied). To drop in a real photo later:
            multiply-blend it with linear-gradient(#0D0812, #A238FF) at ~70%
            opacity over the image, so any photo lands on-brand automatically. */}
        <div
          className="relative hidden min-h-[320px] overflow-hidden [clip-path:polygon(14%_0,100%_0,100%_100%,0%_100%)] lg:block"
          style={{
            background:
              "repeating-linear-gradient(115deg, rgba(244,239,249,0.05) 0 2px, transparent 2px 34px), " +
              "radial-gradient(420px 320px at 85% 15%, rgba(162,56,255,0.55), transparent 65%), " +
              "radial-gradient(360px 300px at 15% 85%, rgba(76,23,128,0.6), transparent 65%), " +
              "linear-gradient(160deg, #170c22, #0d0812 70%)",
          }}
        />
      </section>

      {/* Live / upcoming preview */}
      <section className="border-t border-border">
        <Container size="lg" className="flex flex-col gap-4 py-12">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl uppercase tracking-wide">
              {showUpcoming ? "Coming up" : "Live now"}
            </h2>
            <Link href="/live" className="text-sm text-muted-foreground hover:text-primary">
              View all live scores
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {isLiveLoading && (
              <>
                <Skeleton className="h-16 rounded-md" />
                <Skeleton className="h-16 rounded-md" />
              </>
            )}
            {!isLiveLoading && liveCount > 0 &&
              liveData!.data.map((fixture) => <LiveScoreCard key={fixture.id} fixture={fixture} />)}
            {!isLiveLoading && liveCount === 0 && (
              <>
                {isUpcomingLoading && <Skeleton className="h-16 rounded-md" />}
                {upcomingData?.data.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>
                )}
                {upcomingData?.data.map((fixture) => (
                  <FixtureRow key={fixture.id} fixture={fixture} />
                ))}
              </>
            )}
          </div>
        </Container>
      </section>

      {/* Feature highlights */}
      <section className="border-t border-border">
        <Container size="lg" className="grid grid-cols-1 gap-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="size-5 text-primary" />
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{description}</CardContent>
            </Card>
          ))}
        </Container>
      </section>
    </div>
  );
}
