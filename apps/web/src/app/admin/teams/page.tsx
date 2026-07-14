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
  createTeam,
  deleteTeam,
  fetchTeamsForAdmin,
  updateTeam,
  type TeamInput,
} from "@/features/teams/api";
import { TeamFormDialog } from "@/features/teams/team-form-dialog";
import type { Team } from "@4ef/shared";

export default function AdminTeamsPage() {
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
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-teams"],
    queryFn: () => fetchTeamsForAdmin({ limit: 100, sortBy: "name", sortOrder: "asc" }),
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (input: TeamInput) => createTeam(input),
    onSuccess: () => {
      toast.success("Team created");
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
      setIsDialogOpen(false);
    },
    onError: () => toast.error("Failed to create team"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TeamInput }) =>
      updateTeam(id, input),
    onSuccess: () => {
      toast.success("Team updated");
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
      setIsDialogOpen(false);
      setEditingTeam(null);
    },
    onError: () => toast.error("Failed to update team"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateTeam(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
    },
    onError: () => toast.error("Failed to update team status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTeam(id),
    onSuccess: () => {
      toast.success("Team deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
    },
    onError: () => toast.error("Failed to delete team"),
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
        <h1 className="text-2xl font-semibold">Manage teams</h1>
        <Button
          onClick={() => {
            setEditingTeam(null);
            setIsDialogOpen(true);
          }}
        >
          New team
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading teams...</p>}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((team) => (
              <TableRow key={team.id}>
                <TableCell className="font-medium">{team.name}</TableCell>
                <TableCell>{team.country ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={team.isActive ? "default" : "secondary"}>
                    {team.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingTeam(team);
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
                        id: team.id,
                        isActive: !team.isActive,
                      })
                    }
                  >
                    {team.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm(`Delete ${team.name}? This cannot be undone.`)) {
                        deleteMutation.mutate(team.id);
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

      <TeamFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        team={editingTeam}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editingTeam) {
            await updateMutation.mutateAsync({ id: editingTeam.id, input: values });
          } else {
            await createMutation.mutateAsync(values);
          }
        }}
      />
    </div>
  );
}
