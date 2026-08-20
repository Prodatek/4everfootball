"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/layout/container";
import {
  addOrganisationMember,
  fetchOrganisationById,
  fetchOrganisationMembers,
  type OrganisationMemberRole,
} from "@/features/organisations/api";
import { AddMemberDialog } from "@/features/organisations/add-member-dialog";
import { fetchCompetitionsForAdmin } from "@/features/competitions/api";
import { Money } from "@/components/monetisation/money";
import { COMPETITION_TIERS, type CompetitionTierKey } from "@4ef/shared";

export default function OrganisationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const {
    data: organisation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["organisation", id],
    queryFn: () => fetchOrganisationById(id),
    retry: (failureCount, err) =>
      isAxiosError(err) && err.response?.status === 404 ? false : failureCount < 1,
  });

  const {
    data: members,
    isLoading: membersLoading,
    isError: membersError,
  } = useQuery({
    queryKey: ["organisation-members", id],
    queryFn: () => fetchOrganisationMembers(id),
  });

  const {
    data: competitions,
    isLoading: competitionsLoading,
    isError: competitionsError,
  } = useQuery({
    queryKey: ["organisation-competitions", id],
    queryFn: () => fetchCompetitionsForAdmin({ organisationId: id, limit: 50 }),
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: OrganisationMemberRole }) =>
      addOrganisationMember(id, userId, role),
    onSuccess: () => {
      toast.success("Member added");
      void queryClient.invalidateQueries({ queryKey: ["organisation-members", id] });
      setAddMemberOpen(false);
    },
    onError: () => toast.error("Failed to add member"),
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (error || !organisation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Organisation not found.</p>
        <Button render={<Link href="/admin/organisations" />} variant="outline">
          Back to organisations
        </Button>
      </div>
    );
  }

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-6 py-6">
      <Button render={<Link href="/admin/organisations" />} variant="outline" className="w-fit">
        Back to organisations
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-2xl uppercase">
            {organisation.name}
            <Badge variant="secondary">{organisation.type}</Badge>
          </CardTitle>
          <CardAction className="flex gap-2">
            <Button size="sm" variant="outline" render={<Link href={`/admin/organisations/${id}/billing`} />}>
              Billing
            </Button>
            <Button size="sm" render={<Link href={`/admin/organisations/${id}/competitions/new`} />}>
              New competition
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <p><span className="text-muted-foreground">Contact:</span> {organisation.contactName ?? "—"}</p>
          <p><span className="text-muted-foreground">Phone:</span> {organisation.phone ?? "—"}</p>
          <p><span className="text-muted-foreground">Email:</span> {organisation.email ?? "—"}</p>
          <p><span className="text-muted-foreground">RC number:</span> {organisation.rcNumber ?? "—"}</p>
          <p className="col-span-2"><span className="text-muted-foreground">Address:</span> {organisation.address ?? "—"}</p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg uppercase">Competitions</h2>
        <Button size="sm" variant="outline" render={<Link href={`/admin/organisations/${id}/competitions/new`} />}>
          New competition
        </Button>
      </div>

      {competitionsLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 rounded-md" />
        </div>
      )}

      {!competitionsLoading && competitionsError && (
        <p className="text-sm text-destructive">Failed to load competitions.</p>
      )}

      {!competitionsLoading && !competitionsError && competitions?.data.length === 0 && (
        <Card size="sm">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-muted-foreground">No competitions yet.</p>
            <Button size="sm" render={<Link href={`/admin/organisations/${id}/competitions/new`} />}>
              Create the first one
            </Button>
          </CardContent>
        </Card>
      )}

      {!competitionsLoading && !competitionsError && competitions && competitions.data.length > 0 && (
        <div className="flex flex-col gap-3">
          {competitions.data.map((competition) => {
            const tier = (competition as unknown as { tier: CompetitionTierKey }).tier;
            const licenceStatus = (competition as unknown as { licenceStatus: string }).licenceStatus;
            return (
              <Card key={competition.id} size="sm">
                <CardContent className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <Link href={`/admin/organisations/${id}/competitions/${competition.slug}`} className="font-medium hover:underline">
                      {competition.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {competition.season} · {tier ? COMPETITION_TIERS[tier].label : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={licenceStatus === "ACTIVE" ? "default" : "secondary"}>
                      {licenceStatus ?? "DRAFT"}
                    </Badge>
                    {tier && <Money kobo={COMPETITION_TIERS[tier].priceKobo} className="text-sm text-muted-foreground" />}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg uppercase">Members</h2>
        <Button type="button" onClick={() => setAddMemberOpen(true)}>
          Add member
        </Button>
      </div>

      {membersLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-md" />
          ))}
        </div>
      )}

      {!membersLoading && membersError && (
        <p className="text-sm text-destructive">Failed to load members.</p>
      )}

      {!membersLoading && !membersError && members?.length === 0 && (
        <Card size="sm">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-muted-foreground">No members yet.</p>
            <Button type="button" onClick={() => setAddMemberOpen(true)}>
              Add the first member
            </Button>
          </CardContent>
        </Card>
      )}

      {!membersLoading && !membersError && members && members.length > 0 && (
        <div className="flex flex-col gap-3">
          {members.map((member) => (
            <Card key={member.userId} size="sm">
              <CardContent className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <p className="font-medium">{member.user.displayName}</p>
                  <p className="text-sm text-muted-foreground">{member.user.email}</p>
                </div>
                <Badge variant="outline">{member.role}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddMemberDialog
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        isSubmitting={addMemberMutation.isPending}
        onAdd={async (userId, role) => {
          await addMemberMutation.mutateAsync({ userId, role });
        }}
      />
    </Container>
  );
}
