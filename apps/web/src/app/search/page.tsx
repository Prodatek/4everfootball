"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { search } from "@/features/search/api";

function SearchResultsView() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["search", q],
    queryFn: () => search(q, 10),
    enabled: q.length > 0,
  });

  if (!q) {
    return <p className="text-muted-foreground">Type something in the search bar above.</p>;
  }

  if (isLoading) {
    return <p className="text-muted-foreground">Searching...</p>;
  }

  const hasResults =
    data &&
    (data.teams.length > 0 ||
      data.players.length > 0 ||
      data.competitions.length > 0 ||
      data.news.length > 0);

  if (!hasResults) {
    return <p className="text-muted-foreground">No results for &quot;{q}&quot;.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {data.teams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {data.teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.slug}`}
                className="rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                {team.name}
                {team.country && (
                  <span className="text-muted-foreground"> · {team.country}</span>
                )}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {data.players.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Players</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {data.players.map((player) => (
              <Link
                key={player.id}
                href={`/players/${player.slug}`}
                className="rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                {player.firstName} {player.lastName}
                {player.teamName && (
                  <span className="text-muted-foreground"> · {player.teamName}</span>
                )}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {data.competitions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Competitions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {data.competitions.map((competition) => (
              <Link
                key={competition.id}
                href={`/competitions/${competition.slug}`}
                className="rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                {competition.name}
                <span className="text-muted-foreground"> · {competition.season}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {data.news.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>News</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {data.news.map((article) => (
              <Link
                key={article.id}
                href={`/news/${article.slug}`}
                className="rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                {article.title}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Search</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
        <SearchResultsView />
      </Suspense>
    </div>
  );
}
