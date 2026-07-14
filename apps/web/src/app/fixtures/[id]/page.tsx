"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchFixtureById } from "@/features/fixtures/api";

export default function FixtureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const {
    data: fixture,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["fixture", id],
    queryFn: () => fetchFixtureById(id),
    retry: (failureCount, err) =>
      isAxiosError(err) && err.response?.status === 404 ? false : failureCount < 1,
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (error || !fixture) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Fixture not found.</p>
        <Button render={<Link href="/fixtures" />} variant="outline">
          Back to fixtures
        </Button>
      </div>
    );
  }

  const hasScore = fixture.homeScore !== null && fixture.awayScore !== null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <Button render={<Link href="/fixtures" />} variant="outline" className="w-fit">
        Back to fixtures
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Link href={`/teams/${fixture.homeTeam.slug}`} className="hover:underline">
              {fixture.homeTeam.name}
            </Link>
            <span className="font-mono">
              {hasScore ? `${fixture.homeScore} - ${fixture.awayScore}` : "vs"}
            </span>
            <Link href={`/teams/${fixture.awayTeam.slug}`} className="hover:underline">
              {fixture.awayTeam.name}
            </Link>
            <Badge variant={fixture.status === "LIVE" ? "default" : "secondary"}>
              {fixture.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            <span className="text-muted-foreground">Competition:</span>{" "}
            <Link
              href={`/competitions/${fixture.competition.slug}`}
              className="underline underline-offset-4"
            >
              {fixture.competition.name}
            </Link>
          </p>
          <p>
            <span className="text-muted-foreground">Kickoff:</span>{" "}
            {new Date(fixture.kickoffAt).toLocaleString(undefined, {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </p>
          <p>
            <span className="text-muted-foreground">Venue:</span>{" "}
            {fixture.venueName ?? "TBD"}
          </p>
          {fixture.matchday && (
            <p>
              <span className="text-muted-foreground">Matchday:</span> {fixture.matchday}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
