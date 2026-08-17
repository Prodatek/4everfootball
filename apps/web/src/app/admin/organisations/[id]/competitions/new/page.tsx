"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { fetchOrganisationById } from "@/features/organisations/api";
import { CompetitionWizard } from "@/features/competitions/wizard/competition-wizard";

export default function NewCompetitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: organisation, isLoading, error } = useQuery({
    queryKey: ["organisation", id],
    queryFn: () => fetchOrganisationById(id),
    retry: (failureCount, err) =>
      isAxiosError(err) && err.response?.status === 404 ? false : failureCount < 1,
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
      <Button render={<Link href={`/admin/organisations/${id}`} />} variant="outline" className="w-fit">
        Back to {organisation.name}
      </Button>
      <CompetitionWizard organisationId={id} organisationName={organisation.name} />
    </Container>
  );
}
