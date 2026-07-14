"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ALL_FIXTURE_STATUSES, type FixtureStatus } from "@4ef/shared";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchFixtures } from "@/features/fixtures/api";
import { FixtureRow } from "@/features/fixtures/fixture-row";

export default function FixturesPage() {
  const [status, setStatus] = useState<FixtureStatus | "all">("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["fixtures", { status, page }],
    queryFn: () =>
      fetchFixtures({
        status: status === "all" ? undefined : status,
        page,
        limit: 15,
        sortBy: "kickoffAt",
        sortOrder: "asc",
      }),
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Fixtures</h1>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus((value as FixtureStatus | "all") ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_FIXTURE_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading fixtures...</p>}
      {isError && <p className="text-destructive">Failed to load fixtures.</p>}
      {data && data.data.length === 0 && (
        <p className="text-muted-foreground">No fixtures found.</p>
      )}

      <div className="flex flex-col gap-2">
        {data?.data.map((fixture) => (
          <FixtureRow key={fixture.id} fixture={fixture} />
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
