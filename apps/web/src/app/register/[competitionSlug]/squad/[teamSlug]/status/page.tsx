"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, Clock, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/layout/container";
import { Money } from "@/components/monetisation/money";
import { fetchCompetitionBySlug } from "@/features/competitions/api";
import { fetchTeamBySlug, type TeamWithOrganisation } from "@/features/teams/api";
import {
  fetchRegistrationsForCompetition,
  fetchSquadShareToken,
} from "@/features/squad-registration/api";

const PAID_STATUSES = new Set(["CONFIRMED", "LOCKED"]);

export default function SquadStatusPage({
  params,
}: {
  params: Promise<{ competitionSlug: string; teamSlug: string }>;
}) {
  const { competitionSlug, teamSlug } = use(params);
  const [copied, setCopied] = useState(false);

  const { data: competition, isLoading: competitionLoading } = useQuery({
    queryKey: ["competition", competitionSlug],
    queryFn: () => fetchCompetitionBySlug(competitionSlug),
  });

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["team", teamSlug],
    queryFn: () => fetchTeamBySlug(teamSlug),
  });
  const teamWithOrg = team as unknown as TeamWithOrganisation | undefined;

  const { data: registrations, isLoading: registrationsLoading } = useQuery({
    queryKey: ["squad-registrations", competition?.id, teamWithOrg?.id],
    queryFn: () => fetchRegistrationsForCompetition(competition!.id, teamWithOrg!.id),
    enabled: !!competition?.id && !!teamWithOrg?.id,
  });

  const { data: shareToken } = useQuery({
    queryKey: ["share-token", competition?.id, teamWithOrg?.id],
    queryFn: () => fetchSquadShareToken(competition!.id, teamWithOrg!.id),
    enabled: !!competition?.id && !!teamWithOrg?.id,
  });

  const isLoading = competitionLoading || teamLoading || registrationsLoading;

  if (isLoading) {
    return (
      <Container size="sm" className="flex flex-1 flex-col gap-4 py-6">
        <Skeleton className="h-64 rounded-md" />
      </Container>
    );
  }

  if (!competition || !team || !registrations) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Squad not found.
      </div>
    );
  }

  const paidCount = registrations.filter((r) => PAID_STATUSES.has(r.status)).length;
  const outstandingKobo = registrations
    .filter((r) => !PAID_STATUSES.has(r.status))
    .reduce((sum, r) => sum + r.priceKobo, 0);

  const shareUrl =
    shareToken && typeof window !== "undefined"
      ? `${window.location.origin}/squad-status/${competitionSlug}/${teamSlug}?token=${shareToken}`
      : null;

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-6 py-6">
      <Button
        render={<Link href={`/register/${competitionSlug}/squad/${teamSlug}`} />}
        variant="outline"
        className="w-fit"
      >
        Back to squad
      </Button>

      {/* Designed to be screenshotted — brief §5 B5. */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl uppercase">{team.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{competition.name}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
              <p className="text-2xl font-heading">{registrations.length}</p>
              <p className="text-xs text-muted-foreground">Players</p>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
              <p className="text-2xl font-heading text-live">{paidCount}</p>
              <p className="text-xs text-muted-foreground">Confirmed</p>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
              <p className="text-2xl font-heading">
                <Money kobo={outstandingKobo} />
              </p>
              <p className="text-xs text-muted-foreground">Owed</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {registrations.map((r) => {
              const isPaid = PAID_STATUSES.has(r.status);
              return (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span>{r.player.firstName} {r.player.lastName}</span>
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
        <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
          <span>4everfootball.com</span>
          <span>{new Date().toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>
        </CardFooter>
      </Card>

      <Button
        type="button"
        variant="outline"
        disabled={!shareUrl}
        onClick={() => {
          if (!shareUrl) return;
          void navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        <Copy className="size-4" />
        {copied ? "Link copied" : "Copy shareable link"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Anyone with this link can see this status page — no login needed. Send it to your
        organiser.
      </p>
    </Container>
  );
}
