"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Container } from "@/components/layout/container";
import { fetchCompetitionBySlug, fetchCompetitionEntries } from "@/features/competitions/api";
import { fetchFixtures } from "@/features/fixtures/api";
import {
  downloadGraphicImage,
  downloadGraphicsZip,
  fetchGraphicsForCompetition,
  GRAPHIC_TEMPLATE_LABELS,
  type GraphicTemplate,
} from "@/features/graphics/api";
import { GraphicStatusBadge } from "@/features/graphics/graphic-status-badge";

const ALL_TEMPLATES = Object.keys(GRAPHIC_TEMPLATE_LABELS) as GraphicTemplate[];

export default function CompetitionMediaLibraryPage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id: organisationId, slug } = use(params);
  const [template, setTemplate] = useState<GraphicTemplate | "ALL">("ALL");
  const [teamId, setTeamId] = useState<string>("ALL");
  const [fixtureId, setFixtureId] = useState<string>("ALL");

  const { data: competition, isLoading: competitionLoading } = useQuery({
    queryKey: ["competition", slug],
    queryFn: () => fetchCompetitionBySlug(slug),
  });

  const { data: entries } = useQuery({
    queryKey: ["competition-teams", competition?.id],
    queryFn: () => fetchCompetitionEntries(competition!.id),
    enabled: !!competition?.id,
  });

  const { data: fixtures } = useQuery({
    queryKey: ["competition-fixtures-all", competition?.id],
    queryFn: () =>
      fetchFixtures({ competitionId: competition!.id, limit: 100, sortBy: "kickoffAt", sortOrder: "desc" }),
    enabled: !!competition?.id,
  });

  const query = {
    template: template === "ALL" ? undefined : template,
    teamId: teamId === "ALL" ? undefined : teamId,
    fixtureId: fixtureId === "ALL" ? undefined : fixtureId,
  };

  const { data: graphics, isLoading: graphicsLoading } = useQuery({
    queryKey: ["competition-graphics", competition?.id, query],
    queryFn: () => fetchGraphicsForCompetition(competition!.id, query),
    enabled: !!competition?.id,
  });

  const zipMutation = useMutation({
    mutationFn: () => downloadGraphicsZip(competition!.id, query),
    onError: (error) => {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message ?? "Failed to download zip");
    },
  });

  if (competitionLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <Container size="lg" className="flex flex-1 flex-col gap-6 py-6">
      <Button
        render={<Link href={`/admin/organisations/${organisationId}/competitions/${slug}`} />}
        variant="outline"
        className="w-fit"
      >
        Back to {competition?.name ?? "competition"}
      </Button>

      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl uppercase">Media library</h1>
        <Button
          size="sm"
          disabled={zipMutation.isPending || !graphics || graphics.length === 0}
          onClick={() => zipMutation.mutate()}
        >
          {zipMutation.isPending ? "Preparing zip..." : "Download filtered (zip)"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={template} onValueChange={(v) => setTemplate((v ?? "ALL") as GraphicTemplate | "ALL")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {ALL_TEMPLATES.map((t) => (
              <SelectItem key={t} value={t}>
                {GRAPHIC_TEMPLATE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={teamId} onValueChange={(v) => setTeamId(v ?? "ALL")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Club" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All clubs</SelectItem>
            {entries?.map((entry) => (
              <SelectItem key={entry.teamId} value={entry.teamId}>
                {entry.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={fixtureId} onValueChange={(v) => setFixtureId(v ?? "ALL")}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Match" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All matches</SelectItem>
            {fixtures?.data.map((fixture) => (
              <SelectItem key={fixture.id} value={fixture.id}>
                {fixture.homeTeam.name} v {fixture.awayTeam.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {graphicsLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-md" />
          ))}
        </div>
      )}

      {!graphicsLoading && graphics?.length === 0 && (
        <Card size="sm">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No graphics match this filter yet.
          </CardContent>
        </Card>
      )}

      {!graphicsLoading && graphics && graphics.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {graphics.map((graphic) => (
            <div key={graphic.id} className="flex flex-col gap-2">
              <div className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
                {graphic.publicUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- dynamic, externally-hosted generated graphic
                  <img
                    src={graphic.publicUrl}
                    alt={GRAPHIC_TEMPLATE_LABELS[graphic.template]}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                    {graphic.status === "FAILED" ? "Failed" : "Rendering..."}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{GRAPHIC_TEMPLATE_LABELS[graphic.template]}</span>
                <GraphicStatusBadge status={graphic.status} />
              </div>
              {graphic.publicUrl && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    downloadGraphicImage(
                      graphic.publicUrl!,
                      `${graphic.template.toLowerCase().replace(/_/g, "-")}-${graphic.id.slice(0, 8)}.png`,
                    )
                  }
                >
                  Download
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Container>
  );
}
