"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import type { Player } from "@4ef/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/layout/container";
import { fetchCompetitionBySlug } from "@/features/competitions/api";
import { fetchTeamBySlug } from "@/features/teams/api";
import {
  fetchPlayers,
  createPlayer,
  updatePlayer,
  deletePlayer,
  type PlayerInput,
} from "@/features/players/api";
import { registerPlayerForCompetition } from "@/features/squad-registration/api";
import {
  SquadPlayerFormDialog,
  type SquadPlayerSubmitValues,
} from "@/features/squad-registration/squad-player-form-dialog";
import { SquadPlayerCard } from "@/features/squad-registration/squad-player-card";
import { RunningCostBar } from "@/features/squad-registration/running-cost-bar";
import { toast } from "sonner";

export default function SquadBuilderPage({
  params,
}: {
  params: Promise<{ competitionSlug: string; teamSlug: string }>;
}) {
  const { competitionSlug, teamSlug } = use(params);
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  // No GET exists yet for per-player registration/consent status (see
  // MONETISATION_UI_INVENTORY.md) — this session's writes are tracked
  // locally so the completeness indicator reflects them until a reload.
  const [consentCapturedIds, setConsentCapturedIds] = useState<Set<string>>(new Set());

  const {
    data: competition,
    isLoading: competitionLoading,
    error: competitionError,
  } = useQuery({
    queryKey: ["competition", competitionSlug],
    queryFn: () => fetchCompetitionBySlug(competitionSlug),
    retry: (failureCount, err) =>
      isAxiosError(err) && err.response?.status === 404 ? false : failureCount < 1,
  });

  const {
    data: team,
    isLoading: teamLoading,
    error: teamError,
  } = useQuery({
    queryKey: ["team", teamSlug],
    queryFn: () => fetchTeamBySlug(teamSlug),
    retry: (failureCount, err) =>
      isAxiosError(err) && err.response?.status === 404 ? false : failureCount < 1,
  });

  const {
    data: squadResult,
    isLoading: squadLoading,
    isError: squadError,
  } = useQuery({
    queryKey: ["squad", team?.id],
    queryFn: () => fetchPlayers({ teamId: team!.id, limit: 100 }),
    enabled: !!team?.id,
  });

  const players = squadResult?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async (values: SquadPlayerSubmitValues) => {
      const player = editingPlayer
        ? await updatePlayer(editingPlayer.id, {
            firstName: values.firstName,
            lastName: values.lastName,
            dateOfBirth: values.dateOfBirth,
            position: values.position as PlayerInput["position"],
            photoUrl: values.photoUrl,
          })
        : await createPlayer({
            firstName: values.firstName,
            lastName: values.lastName,
            dateOfBirth: values.dateOfBirth,
            position: values.position as PlayerInput["position"],
            photoUrl: values.photoUrl,
            teamId: team!.id,
          });

      if (values.guardianName || values.guardianPhone || values.guardianEmail) {
        await registerPlayerForCompetition(competition!.id, team!.id, player.id, {
          guardianName: values.guardianName,
          guardianPhone: values.guardianPhone,
          guardianEmail: values.guardianEmail,
        });
        setConsentCapturedIds((prev) => new Set(prev).add(player.id));
      }

      return player;
    },
    onSuccess: () => {
      toast.success(editingPlayer ? "Player updated" : "Player added");
      setDialogOpen(false);
      setEditingPlayer(null);
      void queryClient.invalidateQueries({ queryKey: ["squad", team?.id] });
    },
    onError: () => {
      toast.error("Failed to save player");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (playerId: string) => deletePlayer(playerId),
    onSuccess: () => {
      toast.success("Player removed");
      void queryClient.invalidateQueries({ queryKey: ["squad", team?.id] });
    },
    onError: () => {
      toast.error("Failed to remove player");
    },
  });

  const isLoading = competitionLoading || teamLoading;

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (competitionError || teamError || !competition || !team) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Competition or club not found.</p>
        <Button render={<Link href="/competitions" />} variant="outline">
          Back to competitions
        </Button>
      </div>
    );
  }

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-6 py-6">
      <Button render={<Link href={`/competitions/${competition.slug}`} />} variant="outline" className="w-fit">
        Back to {competition.name}
      </Button>

      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl uppercase">{team.name} squad</h1>
        <p className="text-sm text-muted-foreground">
          Add every player you&apos;re bringing to {competition.name}. Each one is saved as
          soon as you add them — nothing is lost if you get interrupted.
        </p>
      </div>

      <RunningCostBar playerCount={players.length} />

      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg uppercase">Players</h2>
        <Button
          type="button"
          onClick={() => {
            setEditingPlayer(null);
            setDialogOpen(true);
          }}
        >
          Add player
        </Button>
      </div>

      {squadLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-md" />
          ))}
        </div>
      )}

      {!squadLoading && squadError && (
        <p className="text-sm text-destructive">Failed to load the squad. Try reloading.</p>
      )}

      {!squadLoading && !squadError && players.length === 0 && (
        <Card size="sm">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-muted-foreground">No players added yet.</p>
            <Button
              type="button"
              onClick={() => {
                setEditingPlayer(null);
                setDialogOpen(true);
              }}
            >
              Add your first player
            </Button>
          </CardContent>
        </Card>
      )}

      {!squadLoading && !squadError && players.length > 0 && (
        <div className="flex flex-col gap-3">
          {players.map((player) => (
            <SquadPlayerCard
              key={player.id}
              player={player}
              guardianConsentCaptured={consentCapturedIds.has(player.id)}
              onEdit={() => {
                setEditingPlayer(player);
                setDialogOpen(true);
              }}
              onRemove={() => {
                if (window.confirm(`Remove ${player.firstName} ${player.lastName} from the squad?`)) {
                  removeMutation.mutate(player.id);
                }
              }}
              isRemoving={removeMutation.isPending}
            />
          ))}
        </div>
      )}

      <SquadPlayerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        player={editingPlayer}
        onSubmit={async (values) => {
          await saveMutation.mutateAsync(values);
        }}
        isSubmitting={saveMutation.isPending}
      />
    </Container>
  );
}
