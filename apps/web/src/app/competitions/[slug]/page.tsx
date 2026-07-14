"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchCompetitionBySlug, fetchCompetitionEntries } from "@/features/competitions/api";
import { fetchFixtures } from "@/features/fixtures/api";
import { FixtureRow } from "@/features/fixtures/fixture-row";
import { fetchStandings } from "@/features/standings/api";
import { fetchCompetitionForm, fetchTopAssists, fetchTopScorers } from "@/features/stats/api";

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

  const { data: standings } = useQuery({
    queryKey: ["competition-standings", competition?.id],
    queryFn: () => fetchStandings(competition!.id),
    enabled: !!competition?.id,
  });

  const { data: form } = useQuery({
    queryKey: ["competition-form", competition?.id],
    queryFn: () => fetchCompetitionForm(competition!.id),
    enabled: !!competition?.id,
  });

  const { data: topScorers } = useQuery({
    queryKey: ["competition-top-scorers", competition?.id],
    queryFn: () => fetchTopScorers(competition!.id),
    enabled: !!competition?.id,
  });

  const { data: topAssists } = useQuery({
    queryKey: ["competition-top-assists", competition?.id],
    queryFn: () => fetchTopAssists(competition!.id),
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
          <CardTitle>Standings</CardTitle>
        </CardHeader>
        <CardContent>
          {standings && standings.length === 0 && (
            <p className="text-sm text-muted-foreground">No teams entered yet.</p>
          )}
          {standings && standings.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">P</TableHead>
                  <TableHead className="text-right">W</TableHead>
                  <TableHead className="text-right">D</TableHead>
                  <TableHead className="text-right">L</TableHead>
                  <TableHead className="text-right">GD</TableHead>
                  <TableHead className="text-right">Pts</TableHead>
                  <TableHead>Form</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((row) => {
                  const teamForm = form?.find((entry) => entry.teamId === row.teamId);

                  return (
                    <TableRow key={row.teamId}>
                      <TableCell>{row.position}</TableCell>
                      <TableCell>
                        <Link
                          href={`/teams/${row.teamSlug}`}
                          className="hover:underline"
                        >
                          {row.teamName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">{row.played}</TableCell>
                      <TableCell className="text-right">{row.won}</TableCell>
                      <TableCell className="text-right">{row.drawn}</TableCell>
                      <TableCell className="text-right">{row.lost}</TableCell>
                      <TableCell className="text-right">{row.goalDifference}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {row.points}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {teamForm?.results.map((result, index) => (
                            <Badge
                              key={index}
                              variant={
                                result === "W"
                                  ? "default"
                                  : result === "L"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className="size-5 justify-center p-0 text-[10px]"
                            >
                              {result}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top scorers</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {topScorers && topScorers.length === 0 && (
              <p className="text-sm text-muted-foreground">No goals recorded yet.</p>
            )}
            {topScorers?.map((row) => (
              <Link
                key={row.playerId}
                href={`/players/${row.playerSlug}`}
                className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-muted"
              >
                <span>{row.playerName}</span>
                <span className="font-semibold">{row.count}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top assists</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {topAssists && topAssists.length === 0 && (
              <p className="text-sm text-muted-foreground">No assists recorded yet.</p>
            )}
            {topAssists?.map((row) => (
              <Link
                key={row.playerId}
                href={`/players/${row.playerSlug}`}
                className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-muted"
              >
                <span>{row.playerName}</span>
                <span className="font-semibold">{row.count}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

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
