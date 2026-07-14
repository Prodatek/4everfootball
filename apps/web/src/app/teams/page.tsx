"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchTeams } from "@/features/teams/api";

export default function TeamsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["teams", { search, page }],
    queryFn: () => fetchTeams({ search: search || undefined, page, limit: 12 }),
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Teams</h1>
        <Input
          placeholder="Search teams..."
          className="max-w-xs"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {isLoading && <p className="text-muted-foreground">Loading teams...</p>}
      {isError && <p className="text-destructive">Failed to load teams.</p>}

      {data && data.data.length === 0 && (
        <p className="text-muted-foreground">No teams found.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {data?.data.map((team) => (
          <Link key={team.id} href={`/teams/${team.slug}`}>
            <Card className="transition-colors hover:bg-muted">
              <CardHeader>
                <CardTitle className="text-base">{team.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {team.country ?? "Unknown country"}
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
