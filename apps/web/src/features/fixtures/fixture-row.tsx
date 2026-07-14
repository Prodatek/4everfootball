import Link from "next/link";
import type { Fixture } from "@4ef/shared";
import { Badge } from "@/components/ui/badge";

function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function FixtureRow({ fixture }: { fixture: Fixture }) {
  const hasScore = fixture.homeScore !== null && fixture.awayScore !== null;

  return (
    <Link
      href={`/fixtures/${fixture.id}`}
      className="flex items-center justify-between gap-4 rounded-md border px-4 py-3 hover:bg-muted"
    >
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">
          {fixture.homeTeam.name} vs {fixture.awayTeam.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {fixture.competition.name} · {formatKickoff(fixture.kickoffAt)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {hasScore && (
          <span className="font-mono text-sm">
            {fixture.homeScore} - {fixture.awayScore}
          </span>
        )}
        <Badge variant={fixture.status === "LIVE" ? "default" : "secondary"}>
          {fixture.status}
        </Badge>
      </div>
    </Link>
  );
}
