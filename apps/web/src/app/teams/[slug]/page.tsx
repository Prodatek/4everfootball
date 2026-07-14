"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchTeamBySlug } from "@/features/teams/api";
import { fetchPlayers } from "@/features/players/api";
import { fetchFixtures } from "@/features/fixtures/api";
import { FixtureRow } from "@/features/fixtures/fixture-row";

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const { data: team, isLoading, error } = useQuery({
    queryKey: ["team", slug],
    queryFn: () => fetchTeamBySlug(slug),
    retry: (failureCount, err) =>
      isAxiosError(err) && err.response?.status === 404 ? false : failureCount < 1,
  });

  const { data: squad } = useQuery({
    queryKey: ["team-squad", team?.id],
    queryFn: () =>
      fetchPlayers({ teamId: team!.id, limit: 50, sortBy: "lastName", sortOrder: "asc" }),
    enabled: !!team?.id,
  });

  const { data: fixtures } = useQuery({
    queryKey: ["team-fixtures", team?.id],
    queryFn: () =>
      fetchFixtures({ teamId: team!.id, limit: 10, sortBy: "kickoffAt", sortOrder: "asc" }),
    enabled: !!team?.id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Team not found.</p>
        <Button render={<Link href="/teams" />} variant="outline">
          Back to teams
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <Button render={<Link href="/teams" />} variant="outline" className="w-fit">
        Back to teams
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{team.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {team.shortName && (
            <p>
              <span className="text-muted-foreground">Short name:</span>{" "}
              {team.shortName}
            </p>
          )}
          <p>
            <span className="text-muted-foreground">Country:</span>{" "}
            {team.country ?? "Unknown"}
          </p>
          <p>
            <span className="text-muted-foreground">Founded:</span>{" "}
            {team.foundedYear ?? "Unknown"}
          </p>
          <p>
            <span className="text-muted-foreground">Venue:</span>{" "}
            {team.venueName ?? "Unknown"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Squad</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {squad && squad.data.length === 0 && (
            <p className="text-muted-foreground">No players assigned yet.</p>
          )}
          {squad?.data.map((player) => (
            <Link
              key={player.id}
              href={`/players/${player.slug}`}
              className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"
            >
              <span>
                {player.firstName} {player.lastName}
              </span>
              <span className="text-muted-foreground">
                {player.shirtNumber ? `#${player.shirtNumber}` : ""}{" "}
                {player.position ?? ""}
              </span>
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
