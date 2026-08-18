"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/layout/container";
import { Money } from "@/components/monetisation/money";
import { fetchCompetitionBySlug, fetchCompetitionEntries } from "@/features/competitions/api";
import {
  fetchRegistrationsForCompetition,
  recordCashOverride,
  type PlayerRegistration,
} from "@/features/squad-registration/api";
import { CashOverrideDialog } from "@/features/squad-registration/cash-override-dialog";

const PAID_STATUSES = new Set(["CONFIRMED", "LOCKED"]);

export default function RegistrationsConsolePage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id: organisationId, slug } = use(params);
  const queryClient = useQueryClient();
  const [overrideTeamId, setOverrideTeamId] = useState<string | null>(null);
  const [selectedByTeam, setSelectedByTeam] = useState<Record<string, Set<string>>>({});

  const { data: competition, isLoading: competitionLoading } = useQuery({
    queryKey: ["competition", slug],
    queryFn: () => fetchCompetitionBySlug(slug),
  });

  const { data: entries } = useQuery({
    queryKey: ["competition-teams", competition?.id],
    queryFn: () => fetchCompetitionEntries(competition!.id),
    enabled: !!competition?.id,
  });

  const {
    data: registrations,
    isLoading: registrationsLoading,
    isError,
  } = useQuery({
    queryKey: ["competition-registrations", competition?.id],
    queryFn: () => fetchRegistrationsForCompetition(competition!.id),
    enabled: !!competition?.id,
  });

  const teamNames = useMemo(() => {
    const map = new Map<string, string>();
    entries?.forEach((e) => map.set(e.teamId, e.name));
    return map;
  }, [entries]);

  const byTeam = useMemo(() => {
    const groups = new Map<string, PlayerRegistration[]>();
    registrations?.forEach((r) => {
      const list = groups.get(r.teamId) ?? [];
      list.push(r);
      groups.set(r.teamId, list);
    });
    return groups;
  }, [registrations]);

  const overrideMutation = useMutation({
    mutationFn: (reason: string) =>
      recordCashOverride(competition!.id, Array.from(selectedByTeam[overrideTeamId!] ?? []), reason),
    onSuccess: () => {
      toast.success("Marked as paid");
      void queryClient.invalidateQueries({ queryKey: ["competition-registrations", competition?.id] });
      setOverrideTeamId(null);
      setSelectedByTeam((prev) => ({ ...prev, [overrideTeamId!]: new Set() }));
    },
    onError: () => toast.error("Failed to record override"),
  });

  if (competitionLoading) {
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

  const overrideSelected = overrideTeamId ? (selectedByTeam[overrideTeamId] ?? new Set()) : new Set<string>();
  const overrideRegistrations = (overrideTeamId ? byTeam.get(overrideTeamId) : [])?.filter((r) =>
    overrideSelected.has(r.id),
  ) ?? [];
  const overrideTotalKobo = overrideRegistrations.reduce((sum, r) => sum + r.priceKobo, 0);

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-6 py-6">
      <Button
        render={<Link href={`/admin/organisations/${organisationId}/competitions/${slug}`} />}
        variant="outline"
        className="w-fit"
      >
        Back to {competition.name}
      </Button>

      <h1 className="font-heading text-2xl uppercase">Registrations</h1>

      {registrationsLoading && <Skeleton className="h-32 rounded-md" />}
      {isError && <p className="text-sm text-destructive">Failed to load registrations.</p>}

      {!registrationsLoading && !isError && byTeam.size === 0 && (
        <p className="text-sm text-muted-foreground">No clubs have registered players yet.</p>
      )}

      {Array.from(byTeam.entries()).map(([teamId, regs]) => {
        const paid = regs.filter((r) => PAID_STATUSES.has(r.status));
        const unpaid = regs.filter((r) => !PAID_STATUSES.has(r.status));
        const outstandingKobo = unpaid.reduce((sum, r) => sum + r.priceKobo, 0);
        const selected = selectedByTeam[teamId] ?? new Set<string>();

        return (
          <Card key={teamId}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{teamNames.get(teamId) ?? "Unknown team"}</span>
                <Badge variant={unpaid.length === 0 ? "default" : "secondary"}>
                  {paid.length} / {regs.length} paid
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {unpaid.length === 0 ? (
                <p className="text-sm text-muted-foreground">Fully paid.</p>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {unpaid.map((r) => (
                      <label key={r.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2">
                          <Checkbox
                            checked={selected.has(r.id)}
                            onCheckedChange={(checked) => {
                              setSelectedByTeam((prev) => {
                                const next = new Set(prev[teamId] ?? []);
                                if (checked) next.add(r.id);
                                else next.delete(r.id);
                                return { ...prev, [teamId]: next };
                              });
                            }}
                          />
                          {r.player.firstName} {r.player.lastName}
                        </span>
                        <Money kobo={r.priceKobo} className="text-muted-foreground" />
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="text-muted-foreground">
                      Outstanding: <Money kobo={outstandingKobo} />
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selected.size === 0}
                      onClick={() => setOverrideTeamId(teamId)}
                    >
                      Mark selected paid (cash)
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}

      <CashOverrideDialog
        open={!!overrideTeamId}
        onOpenChange={(open) => !open && setOverrideTeamId(null)}
        playerCount={overrideRegistrations.length}
        totalKobo={overrideTotalKobo}
        isSubmitting={overrideMutation.isPending}
        onConfirm={(reason) => overrideMutation.mutateAsync(reason)}
      />
    </Container>
  );
}
