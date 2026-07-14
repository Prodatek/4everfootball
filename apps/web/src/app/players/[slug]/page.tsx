"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchPlayerBySlug } from "@/features/players/api";

export default function PlayerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const { data: player, isLoading, error } = useQuery({
    queryKey: ["player", slug],
    queryFn: () => fetchPlayerBySlug(slug),
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

  if (error || !player) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Player not found.</p>
        <Button render={<Link href="/players" />} variant="outline">
          Back to players
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <Button render={<Link href="/players" />} variant="outline" className="w-fit">
        Back to players
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {player.firstName} {player.lastName}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            <span className="text-muted-foreground">Team:</span>{" "}
            {player.team ? (
              <Link href={`/teams/${player.team.slug}`} className="underline underline-offset-4">
                {player.team.name}
              </Link>
            ) : (
              "Free agent"
            )}
          </p>
          <p>
            <span className="text-muted-foreground">Position:</span>{" "}
            {player.position ?? "Unknown"}
          </p>
          <p>
            <span className="text-muted-foreground">Shirt number:</span>{" "}
            {player.shirtNumber ?? "Unknown"}
          </p>
          <p>
            <span className="text-muted-foreground">Nationality:</span>{" "}
            {player.nationality ?? "Unknown"}
          </p>
          <p>
            <span className="text-muted-foreground">Date of birth:</span>{" "}
            {player.dateOfBirth ? player.dateOfBirth.slice(0, 10) : "Unknown"}
          </p>
          <p>
            <span className="text-muted-foreground">Height:</span>{" "}
            {player.heightCm ? `${player.heightCm} cm` : "Unknown"}
          </p>
          <p>
            <span className="text-muted-foreground">Preferred foot:</span>{" "}
            {player.preferredFoot ?? "Unknown"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
