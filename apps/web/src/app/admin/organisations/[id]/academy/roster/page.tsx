"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Player } from "@4ef/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Container } from "@/components/layout/container";
import { EntityImage } from "@/components/media/entity-image";
import {
  assignTeamToAgeGroup,
  createAgeGroup,
  enrollPlayer,
  fetchAgeGroups,
  type AgeGroup,
} from "@/features/academy/api";
import { fetchPlayers } from "@/features/players/api";
import { CreateAgeGroupDialog } from "@/features/academy/create-age-group-dialog";
import { AssignTeamDialog } from "@/features/academy/assign-team-dialog";
import { TermlyReportDialog } from "@/features/academy/termly-report-dialog";

function AgeGroupRoster({
  organisationId,
  ageGroup,
  allAgeGroups,
}: {
  organisationId: string;
  ageGroup: AgeGroup;
  allAgeGroups: AgeGroup[];
}) {
  const queryClient = useQueryClient();
  const team = ageGroup.teams[0];
  const [assignOpen, setAssignOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveTarget, setMoveTarget] = useState<string>("");
  const [reportPlayer, setReportPlayer] = useState<Player | null>(null);

  const { data: players, isLoading } = useQuery({
    queryKey: ["team-players", team?.id],
    queryFn: () => fetchPlayers({ teamId: team!.id, limit: 100, sortBy: "firstName", sortOrder: "asc" }),
    enabled: !!team,
  });

  const assignMutation = useMutation({
    mutationFn: (teamId: string) => assignTeamToAgeGroup(organisationId, ageGroup.id, teamId),
    onSuccess: () => {
      toast.success("Squad assigned");
      void queryClient.invalidateQueries({ queryKey: ["academy-age-groups", organisationId] });
      setAssignOpen(false);
    },
    onError: () => toast.error("Failed to assign squad"),
  });

  const moveMutation = useMutation({
    mutationFn: async (targetAgeGroupId: string) => {
      await Promise.all(
        Array.from(selected).map((playerId) => enrollPlayer(organisationId, targetAgeGroupId, playerId)),
      );
    },
    onSuccess: () => {
      toast.success(`Moved ${selected.size} player${selected.size === 1 ? "" : "s"}`);
      setSelected(new Set());
      setMoveTarget("");
      void queryClient.invalidateQueries({ queryKey: ["team-players"] });
    },
    onError: () => toast.error("Failed to move players"),
  });

  const otherAgeGroups = allAgeGroups.filter((g) => g.id !== ageGroup.id && g.teams[0]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {ageGroup.name}
          {(ageGroup.minAge || ageGroup.maxAge) && (
            <Badge variant="secondary">
              {ageGroup.minAge ?? "?"}–{ageGroup.maxAge ?? "?"}
            </Badge>
          )}
        </CardTitle>
        <CardAction>
          {team ? (
            <span className="text-sm text-muted-foreground">{team.name}</span>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
              Assign squad
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!team && (
          <p className="text-sm text-muted-foreground">
            No squad assigned yet — assign one to start enrolling players.
          </p>
        )}

        {team && isLoading && <Skeleton className="h-16 rounded-md" />}

        {team && !isLoading && players?.data.length === 0 && (
          <p className="text-sm text-muted-foreground">No players enrolled yet.</p>
        )}

        {team && !isLoading && players && players.data.length > 0 && (
          <>
            <div className="flex flex-col gap-1">
              {players.data.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <label className="flex flex-1 items-center gap-3 text-sm">
                    <Checkbox
                      checked={selected.has(player.id)}
                      onCheckedChange={(checked) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(player.id);
                          else next.delete(player.id);
                          return next;
                        });
                      }}
                    />
                    <EntityImage
                      src={player.photoUrl}
                      alt={`${player.firstName} ${player.lastName}`}
                      fallback="player"
                      className="size-8 shrink-0"
                      sizes="32px"
                    />
                    {player.firstName} {player.lastName}
                    {player.shirtNumber && (
                      <span className="text-muted-foreground">#{player.shirtNumber}</span>
                    )}
                  </label>
                  <Button size="xs" variant="ghost" onClick={() => setReportPlayer(player)}>
                    Report
                  </Button>
                </div>
              ))}
            </div>

            {selected.size > 0 && (
              <div className="flex items-center gap-2 border-t border-border pt-3">
                <span className="text-sm text-muted-foreground">
                  {selected.size} selected
                </span>
                <Select value={moveTarget} onValueChange={(value) => setMoveTarget(value ?? "")}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Move to age group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {otherAgeGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!moveTarget || moveMutation.isPending}
                  onClick={() => moveMutation.mutate(moveTarget)}
                >
                  {moveMutation.isPending ? "Moving..." : "Move"}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>

      <AssignTeamDialog
        organisationId={organisationId}
        ageGroupName={ageGroup.name}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onAssign={(teamId) => assignMutation.mutateAsync(teamId)}
      />

      {reportPlayer && (
        <TermlyReportDialog
          organisationId={organisationId}
          ageGroupId={ageGroup.id}
          playerId={reportPlayer.id}
          playerName={`${reportPlayer.firstName} ${reportPlayer.lastName}`}
          open={!!reportPlayer}
          onOpenChange={(open) => !open && setReportPlayer(null)}
        />
      )}
    </Card>
  );
}

export default function AcademyRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: organisationId } = use(params);
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: ageGroups, isLoading } = useQuery({
    queryKey: ["academy-age-groups", organisationId],
    queryFn: () => fetchAgeGroups(organisationId),
  });

  const createMutation = useMutation({
    mutationFn: (input: { name: string; minAge?: number; maxAge?: number }) =>
      createAgeGroup(organisationId, input),
    onSuccess: () => {
      toast.success("Age group created");
      void queryClient.invalidateQueries({ queryKey: ["academy-age-groups", organisationId] });
      setCreateOpen(false);
    },
    onError: () => toast.error("Failed to create age group"),
  });

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-6 py-6">
      <Button render={<Link href={`/admin/organisations/${organisationId}/academy`} />} variant="outline" className="w-fit">
        Back to academy
      </Button>

      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl uppercase">Roster and age groups</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          New age group
        </Button>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-32 rounded-md" />
        </div>
      )}

      {!isLoading && ageGroups?.length === 0 && (
        <Card size="sm">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-muted-foreground">No age groups yet.</p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              Create the first one
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && ageGroups && ageGroups.length > 0 && (
        <div className="flex flex-col gap-4">
          {ageGroups.map((ageGroup) => (
            <AgeGroupRoster
              key={ageGroup.id}
              organisationId={organisationId}
              ageGroup={ageGroup}
              allAgeGroups={ageGroups}
            />
          ))}
        </div>
      )}

      <CreateAgeGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={createMutation.isPending}
        onCreate={(input) => createMutation.mutateAsync(input)}
      />
    </Container>
  );
}
