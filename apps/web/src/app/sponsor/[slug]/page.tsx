"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { EntityImage } from "@/components/media/entity-image";
import { fetchSponsorDashboard } from "@/features/sponsorship/api";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col items-center gap-1 py-6 text-center">
        <p className="font-heading text-3xl tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

// §5 E1: "link-access, read-only, sponsor-branded... A sponsor will open
// this on a phone and screenshot it for their manager. Design for that."
// No login wrapper here — the backend route itself is deliberately
// @Public(), so this page matches it exactly rather than adding a gate the
// API doesn't have.
export default function SponsorDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const { data, isLoading, error } = useQuery({
    queryKey: ["sponsor-dashboard", slug],
    queryFn: () => fetchSponsorDashboard(slug),
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

  if (error || !data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-muted-foreground">Dashboard not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="h-1.5 w-full" style={{ backgroundColor: data.primaryColor ?? "var(--primary)" }} />
      <Container size="sm" className="flex flex-1 flex-col gap-8 py-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <EntityImage
            src={data.competitionLogoUrl}
            alt={data.competitionName}
            fallback="competition"
            className="size-20"
            sizes="80px"
          />
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Sponsor impact dashboard
            </p>
            <h1 className="font-heading text-2xl uppercase">{data.competitionName}</h1>
          </div>
          {data.sponsorLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic, externally-hosted sponsor logo
            <img src={data.sponsorLogoUrl} alt="Sponsor" className="h-10 w-auto object-contain" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Teams" value={data.teamsRegistered} />
          <StatCard label="Players" value={data.playersRegistered} />
          <StatCard
            label="Matches verified"
            value={`${data.matchesVerified} / ${data.matchesPlayed}`}
          />
          <StatCard label="Communities reached" value={data.communitiesCovered} />
          <StatCard label="Minutes of football" value={data.totalMinutes.toLocaleString()} />
          <StatCard
            label="Digital reach"
            value={(data.pageViews + data.graphicsShared).toLocaleString()}
          />
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Every figure above is derived live from the verified match record — nothing here is
          hand-entered.
        </p>
      </Container>
    </div>
  );
}
