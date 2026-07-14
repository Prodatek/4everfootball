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
  createCompetition,
  deleteCompetition,
  fetchCompetitionsForAdmin,
  updateCompetition,
  type CompetitionInput,
} from "@/features/competitions/api";
import { CompetitionFormDialog } from "@/features/competitions/competition-form-dialog";
import { ManageEntriesDialog } from "@/features/competitions/manage-entries-dialog";
import type { Competition } from "@4ef/shared";

export default function AdminCompetitionsPage() {
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
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [manageEntriesFor, setManageEntriesFor] = useState<Competition | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-competitions"],
    queryFn: () =>
      fetchCompetitionsForAdmin({ limit: 100, sortBy: "name", sortOrder: "asc" }),
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (input: CompetitionInput) => createCompetition(input),
    onSuccess: () => {
      toast.success("Competition created");
      queryClient.invalidateQueries({ queryKey: ["admin-competitions"] });
      setIsDialogOpen(false);
    },
    onError: () => toast.error("Failed to create competition"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CompetitionInput }) =>
      updateCompetition(id, input),
    onSuccess: () => {
      toast.success("Competition updated");
      queryClient.invalidateQueries({ queryKey: ["admin-competitions"] });
      setIsDialogOpen(false);
      setEditingCompetition(null);
    },
    onError: () => toast.error("Failed to update competition"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateCompetition(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-competitions"] });
    },
    onError: () => toast.error("Failed to update competition status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCompetition(id),
    onSuccess: () => {
      toast.success("Competition deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-competitions"] });
    },
    onError: () => toast.error("Failed to delete competition"),
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
        <h1 className="text-2xl font-semibold">Manage competitions</h1>
        <Button
          onClick={() => {
            setEditingCompetition(null);
            setIsDialogOpen(true);
          }}
        >
          New competition
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading competitions...</p>}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Season</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((competition) => (
              <TableRow key={competition.id}>
                <TableCell className="font-medium">{competition.name}</TableCell>
                <TableCell>{competition.type}</TableCell>
                <TableCell>{competition.season}</TableCell>
                <TableCell>
                  <Badge variant={competition.isActive ? "default" : "secondary"}>
                    {competition.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setManageEntriesFor(competition)}
                  >
                    Teams
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingCompetition(competition);
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
                        id: competition.id,
                        isActive: !competition.isActive,
                      })
                    }
                  >
                    {competition.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete ${competition.name}? This cannot be undone.`,
                        )
                      ) {
                        deleteMutation.mutate(competition.id);
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

      <CompetitionFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        competition={editingCompetition}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editingCompetition) {
            await updateMutation.mutateAsync({ id: editingCompetition.id, input: values });
          } else {
            await createMutation.mutateAsync(values);
          }
        }}
      />

      <ManageEntriesDialog
        open={!!manageEntriesFor}
        onOpenChange={(openValue) => {
          if (!openValue) setManageEntriesFor(null);
        }}
        competitionId={manageEntriesFor?.id ?? null}
        competitionName={manageEntriesFor?.name}
      />
    </div>
  );
}
