"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { COMPETITION_TIERS, type CompetitionTierKey } from "@4ef/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/layout/container";
import { Money } from "@/components/monetisation/money";
import { fetchCompetitionBySlug, fetchCompetitionEntries, type CompetitionWithLicence } from "@/features/competitions/api";
import { fetchRegistrationsForCompetition } from "@/features/squad-registration/api";
import { fetchFixtures } from "@/features/fixtures/api";

const LICENSED_STATUSES = new Set(["LICENSED", "ACTIVE"]);

export default function CompetitionDashboardPage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id: organisationId, slug } = use(params);

  const {
    data: competition,
    isLoading: competitionLoading,
    error: competitionError,
  } = useQuery({
    queryKey: ["competition", slug],
    queryFn: () => fetchCompetitionBySlug(slug),
    retry: (failureCount, err) =>
      isAxiosError(err) && err.response?.status === 404 ? false : failureCount < 1,
  });
  const licensedCompetition = competition as unknown as CompetitionWithLicence | undefined;

  const { data: entries, isLoading: entriesLoading } = useQuery({
    queryKey: ["competition-teams", licensedCompetition?.id],
    queryFn: () => fetchCompetitionEntries(licensedCompetition!.id),
    enabled: !!licensedCompetition?.id,
  });

  const { data: registrations, isLoading: registrationsLoading, isError: registrationsError } = useQuery({
    queryKey: ["competition-registrations", licensedCompetition?.id],
    queryFn: () => fetchRegistrationsForCompetition(licensedCompetition!.id),
    enabled: !!licensedCompetition?.id,
  });

  const { data: fixtures, isLoading: fixturesLoading } = useQuery({
    queryKey: ["competition-fixtures-upcoming", licensedCompetition?.id],
    queryFn: () =>
      fetchFixtures({
        competitionId: licensedCompetition!.id,
        status: "SCHEDULED",
        limit: 5,
        sortBy: "kickoffAt",
        sortOrder: "asc",
      }),
    enabled: !!licensedCompetition?.id,
  });

  if (competitionLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (competitionError || !licensedCompetition) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Competition not found.</p>
        <Button render={<Link href={`/admin/organisations/${organisationId}`} />} variant="outline">
          Back to organisation
        </Button>
      </div>
    );
  }

  const tierKey = licensedCompetition.tier as CompetitionTierKey;
  const tier = COMPETITION_TIERS[tierKey];
  const isLicensed = LICENSED_STATUSES.has(licensedCompetition.licenceStatus);

  const playersRegistered = registrations?.length ?? 0;
  const playersPaid = registrations?.filter((r) => r.status === "CONFIRMED" || r.status === "LOCKED").length ?? 0;
  const outstandingKobo =
    registrations
      ?.filter((r) => r.status === "DRAFT" || r.status === "PENDING_PAYMENT")
      .reduce((sum, r) => sum + r.priceKobo, 0) ?? 0;

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-6 py-6">
      <Button render={<Link href={`/admin/organisations/${organisationId}`} />} variant="outline" className="w-fit">
        Back to organisation
      </Button>

      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 font-heading text-2xl uppercase">
          {licensedCompetition.name}
          <Badge variant="secondary">{tier.label}</Badge>
        </h1>
        <p className="text-sm text-muted-foreground">{licensedCompetition.season}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Licence</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <Badge variant={isLicensed ? "default" : "secondary"}>
              {licensedCompetition.licenceStatus}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {tier.label} · <Money kobo={tier.priceKobo} />
            </p>
          </div>
          {!isLicensed && (
            <Button
              size="sm"
              render={<Link href={`/admin/organisations/${organisationId}/competitions/${slug}/checkout`} />}
            >
              Pay licence
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Teams entered</p>
            {entriesLoading ? <Skeleton className="h-7 w-10" /> : (
              <p className="font-heading text-2xl">{entries?.length ?? 0}</p>
            )}
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Players registered / paid</p>
            {registrationsLoading ? <Skeleton className="h-7 w-16" /> : (
              <p className="font-heading text-2xl">
                {playersRegistered} <span className="text-base text-muted-foreground">/ {playersPaid} paid</span>
              </p>
            )}
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            {registrationsLoading ? <Skeleton className="h-7 w-20" /> : (
              <p className="font-heading text-2xl">
                <Money kobo={outstandingKobo} />
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {registrationsError && (
        <p className="text-sm text-destructive">Failed to load registration progress.</p>
      )}

      <Button
        variant="outline"
        className="w-fit"
        render={<Link href={`/admin/organisations/${organisationId}/competitions/${slug}/registrations`} />}
      >
        Manage registrations
      </Button>

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg uppercase">Upcoming fixtures</h2>
        {fixturesLoading && <Skeleton className="h-16 rounded-md" />}
        {!fixturesLoading && fixtures?.data.length === 0 && (
          <p className="text-sm text-muted-foreground">No fixtures scheduled yet.</p>
        )}
        {!fixturesLoading && fixtures && fixtures.data.length > 0 && (
          <div className="flex flex-col gap-2">
            {fixtures.data.map((fixture) => (
              <Card key={fixture.id} size="sm">
                <CardContent className="flex items-center justify-between text-sm">
                  <span>
                    {fixture.homeTeam.name} vs {fixture.awayTeam.name}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(fixture.kickoffAt).toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
