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
import { fetchUsers, updateUserRoles, type UpdateUserRolesInput } from "@/features/users/api";
import { EditRolesDialog } from "@/features/users/edit-roles-dialog";
import type { AdminUserSummary } from "@4ef/shared";

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const isAdmin =
    !!user && (user.roles.includes("ADMIN") || user.roles.includes("SUPER_ADMIN"));
  const isSuperAdmin = !!user && user.roles.includes("SUPER_ADMIN");

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAuthLoading, isAdmin, router]);

  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<AdminUserSummary | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers({ limit: 100, sortBy: "displayName", sortOrder: "asc" }),
    enabled: isAdmin,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserRolesInput }) =>
      updateUserRoles(id, input),
    onSuccess: () => {
      toast.success("User updated");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUser(null);
    },
    onError: () => toast.error("Failed to update user"),
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
      <h1 className="text-2xl font-semibold">Manage users</h1>

      {isLoading && <p className="text-muted-foreground">Loading users...</p>}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((row) => {
              const isSelf = row.id === user?.id;

              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.displayName}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {row.roles.map((role) => (
                        <Badge key={role} variant="secondary">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.isActive ? "default" : "destructive"}>
                      {row.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSelf}
                      onClick={() => setEditingUser(row)}
                    >
                      {isSelf ? "This is you" : "Edit"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <EditRolesDialog
        key={editingUser?.id ?? "none"}
        open={!!editingUser}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null);
        }}
        targetUser={editingUser}
        canManageSuperAdmin={isSuperAdmin}
        isSubmitting={updateMutation.isPending}
        onSubmit={async (input) => {
          if (editingUser) {
            await updateMutation.mutateAsync({ id: editingUser.id, input });
          }
        }}
      />
    </div>
  );
}
