"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchCompetitionBySlug, fetchCompetitionEntries } from "@/features/competitions/api";
import { fetchFixtures } from "@/features/fixtures/api";
import { FixtureRow } from "@/features/fixtures/fixture-row";

export default function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const {
    data: competition,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["competition", slug],
    queryFn: () => fetchCompetitionBySlug(slug),
    retry: (failureCount, err) =>
      isAxiosError(err) && err.response?.status === 404 ? false : failureCount < 1,
  });

  const { data: entries } = useQuery({
    queryKey: ["competition-teams", competition?.id],
    queryFn: () => fetchCompetitionEntries(competition!.id),
    enabled: !!competition?.id,
  });

  const { data: fixtures } = useQuery({
    queryKey: ["competition-fixtures", competition?.id],
    queryFn: () =>
      fetchFixtures({
        competitionId: competition!.id,
        limit: 20,
        sortBy: "kickoffAt",
        sortOrder: "asc",
      }),
    enabled: !!competition?.id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (error || !competition) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Competition not found.</p>
        <Button render={<Link href="/competitions" />} variant="outline">
          Back to competitions
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <Button render={<Link href="/competitions" />} variant="outline" className="w-fit">
        Back to competitions
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            {competition.name}
            <Badge variant="secondary">{competition.type}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            <span className="text-muted-foreground">Season:</span> {competition.season}
          </p>
          <p>
            <span className="text-muted-foreground">Country:</span>{" "}
            {competition.country ?? "International"}
          </p>
          <p>
            <span className="text-muted-foreground">Starts:</span>{" "}
            {competition.startDate ? competition.startDate.slice(0, 10) : "TBD"}
          </p>
          <p>
            <span className="text-muted-foreground">Ends:</span>{" "}
            {competition.endDate ? competition.endDate.slice(0, 10) : "TBD"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teams</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {entries && entries.length === 0 && (
            <p className="text-muted-foreground">No teams entered yet.</p>
          )}
          {entries?.map((entry) => (
            <Link
              key={entry.entryId}
              href={`/teams/${entry.slug}`}
              className="rounded-md px-2 py-1.5 hover:bg-muted"
            >
              {entry.name}
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fixtures</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {fixtures && fixtures.data.length === 0 && (
            <p className="text-sm text-muted-foreground">No fixtures scheduled yet.</p>
          )}
          {fixtures?.data.map((fixture) => (
            <FixtureRow key={fixture.id} fixture={fixture} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
