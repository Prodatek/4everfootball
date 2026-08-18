"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Check, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/layout/container";
import { EntityImage } from "@/components/media/entity-image";
import { Money } from "@/components/monetisation/money";
import { fetchCompetitionBySlug } from "@/features/competitions/api";
import { fetchTeamBySlug } from "@/features/teams/api";
import { fetchPublicSquadStatus } from "@/features/squad-registration/api";

const PAID_STATUSES = new Set(["CONFIRMED", "LOCKED"]);

export default function PublicSquadStatusPage({
  params,
}: {
  params: Promise<{ competitionSlug: string; teamSlug: string }>;
}) {
  const { competitionSlug, teamSlug } = use(params);
  const token = useSearchParams().get("token") ?? "";

  const { data: competition } = useQuery({
    queryKey: ["competition", competitionSlug],
    queryFn: () => fetchCompetitionBySlug(competitionSlug),
  });

  const { data: team } = useQuery({
    queryKey: ["team", teamSlug],
    queryFn: () => fetchTeamBySlug(teamSlug),
  });

  const { data: status, isLoading, isError } = useQuery({
    queryKey: ["public-squad-status", competition?.id, team?.id, token],
    queryFn: () => fetchPublicSquadStatus(competition!.id, team!.id, token),
    enabled: !!competition?.id && !!team?.id && !!token,
    retry: false,
  });

  if (!competition || !team || isLoading) {
    return (
      <Container size="sm" className="flex flex-1 flex-col gap-4 py-10">
        <Skeleton className="h-64 rounded-md" />
      </Container>
    );
  }

  if (isError || !status) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-muted-foreground">
          This link is invalid or has expired. Ask the club for a fresh one.
        </p>
      </div>
    );
  }

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-6 py-10">
      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <EntityImage src={status.teamLogoUrl} alt={status.teamName} fallback="team" className="size-12" />
          <div className="flex flex-col">
            <CardTitle className="font-heading text-xl uppercase">{status.teamName}</CardTitle>
            <p className="text-sm text-muted-foreground">{status.competitionName}</p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
              <p className="text-2xl font-heading">{status.totalPlayers}</p>
              <p className="text-xs text-muted-foreground">Players</p>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
              <p className="text-2xl font-heading text-live">{status.paidPlayers}</p>
              <p className="text-xs text-muted-foreground">Confirmed</p>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
              <p className="text-2xl font-heading">
                <Money kobo={status.outstandingKobo} />
              </p>
              <p className="text-xs text-muted-foreground">Owed</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {status.players.map((p, i) => {
              const isPaid = PAID_STATUSES.has(p.status);
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{p.firstName} {p.lastName}</span>
                  <Badge
                    variant="outline"
                    className={isPaid ? "border-live/40 bg-live/10 text-live" : undefined}
                  >
                    {isPaid ? <Check className="size-3.5" /> : <Clock className="size-3.5" />}
                    {isPaid ? "Confirmed" : "Pending"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Verified registration status — 4everfootball.com
        </CardFooter>
      </Card>
    </Container>
  );
}
