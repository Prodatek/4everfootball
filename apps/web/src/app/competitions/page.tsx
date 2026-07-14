"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCompetitions } from "@/features/competitions/api";

export default function CompetitionsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["competitions", { search, page }],
    queryFn: () => fetchCompetitions({ search: search || undefined, page, limit: 12 }),
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Competitions</h1>
        <Input
          placeholder="Search competitions..."
          className="max-w-xs"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {isLoading && <p className="text-muted-foreground">Loading competitions...</p>}
      {isError && <p className="text-destructive">Failed to load competitions.</p>}
      {data && data.data.length === 0 && (
        <p className="text-muted-foreground">No competitions found.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {data?.data.map((competition) => (
          <Link key={competition.id} href={`/competitions/${competition.slug}`}>
            <Card className="transition-colors hover:bg-muted">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {competition.name}
                  <Badge variant="secondary">{competition.type}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {competition.season}
                {competition.country ? ` · ${competition.country}` : ""}
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
