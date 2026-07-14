"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ALL_PLAYER_POSITIONS, type PlayerPosition } from "@4ef/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchPlayers } from "@/features/players/api";

export default function PlayersPage() {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<PlayerPosition | "all">("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["players", { search, position, page }],
    queryFn: () =>
      fetchPlayers({
        search: search || undefined,
        position: position === "all" ? undefined : position,
        page,
        limit: 12,
      }),
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Players</h1>
        <div className="flex gap-3">
          <Select
            value={position}
            onValueChange={(value) => {
              setPosition(value as PlayerPosition | "all");
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All positions</SelectItem>
              {ALL_PLAYER_POSITIONS.map((pos) => (
                <SelectItem key={pos} value={pos}>
                  {pos}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Search players..."
            className="max-w-xs"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading players...</p>}
      {isError && <p className="text-destructive">Failed to load players.</p>}
      {data && data.data.length === 0 && (
        <p className="text-muted-foreground">No players found.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {data?.data.map((player) => (
          <Link key={player.id} href={`/players/${player.slug}`}>
            <Card className="transition-colors hover:bg-muted">
              <CardHeader>
                <CardTitle className="text-base">
                  {player.firstName} {player.lastName}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {player.position ?? "Position unknown"}
                {player.team ? ` · ${player.team.name}` : " · Free agent"}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.meta.page} of {data.meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
