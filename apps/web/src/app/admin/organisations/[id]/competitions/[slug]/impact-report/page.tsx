"use client";

import { use } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Container } from "@/components/layout/container";
import { VerificationTag } from "@/features/sponsorship/verification-tag";
import { fetchCompetitionBySlug } from "@/features/competitions/api";
import {
  downloadImpactReportCsv,
  fetchImpactReportJson,
  generateImpactReportPdf,
} from "@/features/sponsorship/api";

function ReachStat({
  label,
  value,
  kind,
  basis,
}: {
  label: string;
  value: string | number;
  kind: "verified" | "estimated";
  basis?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-xl tabular-nums">{value}</p>
      <VerificationTag kind={kind} basis={basis} />
    </div>
  );
}

export default function ImpactReportPage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id: organisationId, slug } = use(params);

  const { data: competition, isLoading: competitionLoading } = useQuery({
    queryKey: ["competition", slug],
    queryFn: () => fetchCompetitionBySlug(slug),
  });

  const {
    data: report,
    isLoading: reportLoading,
    error: reportError,
  } = useQuery({
    queryKey: ["impact-report", competition?.id],
    queryFn: () => fetchImpactReportJson(competition!.id),
    enabled: !!competition?.id,
    retry: false,
  });

  const notEntitled = isAxiosError(reportError) && reportError.response?.status === 403;

  const pdfMutation = useMutation({
    mutationFn: () => generateImpactReportPdf(competition!.id),
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
    onError: () => toast.error("Failed to generate PDF"),
  });

  const csvMutation = useMutation({
    mutationFn: () => downloadImpactReportCsv(competition!.id),
    onError: () => toast.error("Failed to download CSV"),
  });

  if (competitionLoading || reportLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Competition not found.</p>
      </div>
    );
  }

  if (notEntitled) {
    return (
      <Container size="sm" className="flex flex-1 flex-col gap-6 py-6">
        <Button
          render={<Link href={`/admin/organisations/${organisationId}/competitions/${slug}`} />}
          variant="outline"
          className="w-fit"
        >
          Back to {competition.name}
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="font-medium">Impact Report isn&apos;t enabled for this competition</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              This is a sponsor add-on. Contact the platform team to enable it for this
              competition.
            </p>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Failed to load the impact report.</p>
      </div>
    );
  }

  return (
    <Container size="md" className="flex flex-1 flex-col gap-6 py-6">
      <Button
        render={<Link href={`/admin/organisations/${organisationId}/competitions/${slug}`} />}
        variant="outline"
        className="w-fit"
      >
        Back to {competition.name}
      </Button>

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl uppercase">Impact report</h1>
          <p className="text-sm text-muted-foreground">
            {report.competitionName} · {report.season} · generated{" "}
            {new Date(report.generatedAt).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={csvMutation.isPending}
            onClick={() => csvMutation.mutate()}
          >
            {csvMutation.isPending ? "Downloading..." : "Download CSV"}
          </Button>
          <Button size="sm" disabled={pdfMutation.isPending} onClick={() => pdfMutation.mutate()}>
            {pdfMutation.isPending ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reach</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ReachStat label="Teams registered" value={report.reach.teamsRegistered} kind="verified" />
          <ReachStat label="Players registered" value={report.reach.playersRegistered} kind="verified" />
          <ReachStat
            label="Matches verified"
            value={`${report.reach.matchesVerified} / ${report.reach.matchesPlayed}`}
            kind="verified"
          />
          <ReachStat label="Communities covered" value={report.reach.communitiesCovered} kind="verified" />
          <ReachStat
            label="Minutes delivered"
            value={report.reach.totalMinutes.toLocaleString()}
            kind="verified"
          />
          <ReachStat
            label="Branded graphics delivered"
            value={report.reach.brandedGraphicsDelivered}
            kind="verified"
          />
          <ReachStat
            label="Page views"
            value={report.reach.pageViews.toLocaleString()}
            kind="estimated"
            basis="Counted from API requests to the public competition page, not confirmed unique visitors."
          />
          <ReachStat
            label="Graphics shared"
            value={report.reach.graphicsShared}
            kind="estimated"
            basis="Counted when a share link is requested, not when a share is confirmed sent."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Teams and communities</CardTitle>
        </CardHeader>
        <CardContent>
          {report.teamsAndCommunities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams registered yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Community</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.teamsAndCommunities.map((row, i) => (
                  <TableRow key={`${row.teamName}-${i}`}>
                    <TableCell>{row.teamName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.community ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Players by age group and gender</CardTitle>
        </CardHeader>
        <CardContent>
          {report.playersByAgeGroupAndGender.length === 0 ? (
            <p className="text-sm text-muted-foreground">No confirmed registrations yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Age group</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.playersByAgeGroupAndGender.map((row, i) => (
                  <TableRow key={`${row.ageGroup}-${row.gender}-${i}`}>
                    <TableCell>{row.ageGroup}</TableCell>
                    <TableCell>{row.gender}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {report.playerOutcomes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Player outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.playerOutcomes.map((row, i) => (
                  <TableRow key={`${row.playerName}-${i}`}>
                    <TableCell>{row.playerName}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell className="text-muted-foreground">{row.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}
