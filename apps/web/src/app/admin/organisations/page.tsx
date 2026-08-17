"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { createOrganisation, fetchOrganisations, type OrganisationInput } from "@/features/organisations/api";
import { OrganisationFormDialog } from "@/features/organisations/organisation-form-dialog";

export default function AdminOrganisationsPage() {
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

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-organisations"],
    queryFn: () => fetchOrganisations({ limit: 100 }),
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (input: OrganisationInput) => createOrganisation(input),
    onSuccess: () => {
      toast.success("Organisation created");
      void queryClient.invalidateQueries({ queryKey: ["admin-organisations"] });
      setIsDialogOpen(false);
    },
    onError: () => toast.error("Failed to create organisation"),
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
        <h1 className="text-2xl font-semibold">Organisations</h1>
        <Button onClick={() => setIsDialogOpen(true)}>New organisation</Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading organisations...</p>}
      {isError && <p className="text-sm text-destructive">Failed to load organisations.</p>}

      {data && data.data.length === 0 && (
        <p className="text-muted-foreground">
          No organisations yet — <button className="underline" onClick={() => setIsDialogOpen(true)}>create the first one</button>.
        </p>
      )}

      {data && data.data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((org) => (
              <TableRow key={org.id}>
                <TableCell className="font-medium">{org.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{org.type}</Badge>
                </TableCell>
                <TableCell>{org.email ?? org.contactName ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" render={<Link href={`/admin/organisations/${org.id}`} />}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <OrganisationFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        isSubmitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />
    </div>
  );
}
