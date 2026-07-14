"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/features/auth/auth-context";
import {
  createPlayer,
  deletePlayer,
  fetchPlayersForAdmin,
  updatePlayer,
  type PlayerInput,
} from "@/features/players/api";
import { PlayerFormDialog } from "@/features/players/player-form-dialog";
import type { Player } from "@4ef/shared";

export default function AdminPlayersPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const isAdmin = user?.roles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN");

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAuthLoading, isAdmin, router]);

  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-players"],
    queryFn: () =>
      fetchPlayersForAdmin({ limit: 100, sortBy: "lastName", sortOrder: "asc" }),
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (input: PlayerInput) => createPlayer(input),
    onSuccess: () => {
      toast.success("Player created");
      queryClient.invalidateQueries({ queryKey: ["admin-players"] });
      setIsDialogOpen(false);
    },
    onError: () => toast.error("Failed to create player"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: PlayerInput }) =>
      updatePlayer(id, input),
    onSuccess: () => {
      toast.success("Player updated");
      queryClient.invalidateQueries({ queryKey: ["admin-players"] });
      setIsDialogOpen(false);
      setEditingPlayer(null);
    },
    onError: () => toast.error("Failed to update player"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updatePlayer(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-players"] });
    },
    onError: () => toast.error("Failed to update player status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlayer(id),
    onSuccess: () => {
      toast.success("Player deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-players"] });
    },
    onError: () => toast.error("Failed to delete player"),
  });

  if (isAuthLoading || !isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage players</h1>
        <Button
          onClick={() => {
            setEditingPlayer(null);
            setIsDialogOpen(true);
          }}
        >
          New player
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading players...</p>}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((player) => (
              <TableRow key={player.id}>
                <TableCell className="font-medium">
                  {player.firstName} {player.lastName}
                </TableCell>
                <TableCell>{player.team?.name ?? "Free agent"}</TableCell>
                <TableCell>{player.position ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={player.isActive ? "default" : "secondary"}>
                    {player.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingPlayer(player);
                      setIsDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toggleActiveMutation.mutate({
                        id: player.id,
                        isActive: !player.isActive,
                      })
                    }
                  >
                    {player.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete ${player.firstName} ${player.lastName}? This cannot be undone.`,
                        )
                      ) {
                        deleteMutation.mutate(player.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PlayerFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        player={editingPlayer}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editingPlayer) {
            await updateMutation.mutateAsync({ id: editingPlayer.id, input: values });
          } else {
            await createMutation.mutateAsync(values);
          }
        }}
      />
    </div>
  );
}
