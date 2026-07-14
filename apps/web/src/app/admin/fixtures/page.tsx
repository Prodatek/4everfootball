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
  createFixture,
  deleteFixture,
  fetchFixtures,
  updateFixture,
  type FixtureInput,
  type FixtureUpdateInput,
} from "@/features/fixtures/api";
import { CreateFixtureDialog } from "@/features/fixtures/create-fixture-dialog";
import { EditFixtureDialog } from "@/features/fixtures/edit-fixture-dialog";
import type { Fixture } from "@4ef/shared";

export default function AdminFixturesPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const isAdmin = user?.roles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN");

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAuthLoading, isAdmin, router]);

  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingFixture, setEditingFixture] = useState<Fixture | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-fixtures"],
    queryFn: () => fetchFixtures({ limit: 100, sortBy: "kickoffAt", sortOrder: "desc" }),
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (input: FixtureInput) => createFixture(input),
    onSuccess: () => {
      toast.success("Fixture created");
      queryClient.invalidateQueries({ queryKey: ["admin-fixtures"] });
      setIsCreateOpen(false);
    },
    onError: () => toast.error("Failed to create fixture"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: FixtureUpdateInput }) =>
      updateFixture(id, input),
    onSuccess: () => {
      toast.success("Fixture updated");
      queryClient.invalidateQueries({ queryKey: ["admin-fixtures"] });
      setEditingFixture(null);
    },
    onError: () => toast.error("Failed to update fixture"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFixture(id),
    onSuccess: () => {
      toast.success("Fixture deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-fixtures"] });
    },
    onError: () => toast.error("Failed to delete fixture"),
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
        <h1 className="text-2xl font-semibold">Manage fixtures</h1>
        <Button onClick={() => setIsCreateOpen(true)}>New fixture</Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading fixtures...</p>}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fixture</TableHead>
              <TableHead>Competition</TableHead>
              <TableHead>Kickoff</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((fixture) => (
              <TableRow key={fixture.id}>
                <TableCell className="font-medium">
                  {fixture.homeTeam.name} vs {fixture.awayTeam.name}
                  {fixture.homeScore !== null && fixture.awayScore !== null && (
                    <span className="ml-2 font-mono text-muted-foreground">
                      {fixture.homeScore}-{fixture.awayScore}
                    </span>
                  )}
                </TableCell>
                <TableCell>{fixture.competition.name}</TableCell>
                <TableCell>{new Date(fixture.kickoffAt).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={fixture.status === "LIVE" ? "default" : "secondary"}>
                    {fixture.status}
                  </Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingFixture(fixture)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}? This cannot be undone.`,
                        )
                      ) {
                        deleteMutation.mutate(fixture.id);
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

      <CreateFixtureDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        isSubmitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />

      <EditFixtureDialog
        open={!!editingFixture}
        onOpenChange={(open) => {
          if (!open) setEditingFixture(null);
        }}
        fixture={editingFixture}
        isSubmitting={updateMutation.isPending}
        onSubmit={async (values) => {
          if (editingFixture) {
            await updateMutation.mutateAsync({ id: editingFixture.id, input: values });
          }
        }}
      />
    </div>
  );
}
