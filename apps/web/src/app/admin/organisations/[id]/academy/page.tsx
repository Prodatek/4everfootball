"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/layout/container";
import { fetchOrganisationById } from "@/features/organisations/api";
import { fetchAcademyDashboard, fetchCurrentSubscription } from "@/features/academy/api";

const PLAN_LABELS: Record<string, string> = {
  STARTER: "Starter",
  GROWTH: "Growth",
  ELITE: "Elite",
};

export default function AcademyDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: organisationId } = use(params);

  const { data: organisation } = useQuery({
    queryKey: ["organisation", organisationId],
    queryFn: () => fetchOrganisationById(organisationId),
  });

  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ["academy-dashboard", organisationId],
    queryFn: () => fetchAcademyDashboard(organisationId),
  });

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["academy-subscription", organisationId],
    queryFn: () => fetchCurrentSubscription(organisationId),
  });

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-6 py-6">
      <Button render={<Link href={`/admin/organisations/${organisationId}`} />} variant="outline" className="w-fit">
        Back to {organisation?.name ?? "organisation"}
      </Button>

      <h1 className="font-heading text-2xl uppercase">Academy</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Roster size</p>
            {dashboardLoading ? (
              <Skeleton className="h-7 w-10" />
            ) : (
              <p className="font-heading text-2xl">{dashboard?.rosterSize ?? 0}</p>
            )}
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Age groups</p>
            {dashboardLoading ? (
              <Skeleton className="h-7 w-10" />
            ) : (
              <p className="font-heading text-2xl">{dashboard?.ageGroupCount ?? 0}</p>
            )}
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Attendance this week</p>
            {dashboardLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="font-heading text-2xl">
                {dashboard?.attendanceThisWeek.present ?? 0}
                <span className="text-base text-muted-foreground">
                  {" "}
                  / {dashboard?.attendanceThisWeek.total ?? 0}
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Academy plan</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          {subscriptionLoading ? (
            <Skeleton className="h-6 w-32" />
          ) : subscription ? (
            <div className="flex flex-col gap-1">
              <Badge>{PLAN_LABELS[subscription.planKey] ?? subscription.planKey}</Badge>
              <p className="text-sm text-muted-foreground">
                Renews{" "}
                {new Date(subscription.endDate).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active plan.</p>
          )}
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/admin/organisations/${organisationId}/academy/billing`} />}
          >
            {subscription ? "Manage plan" : "Choose a plan"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          className="h-auto flex-col items-start gap-1 py-4"
          render={<Link href={`/admin/organisations/${organisationId}/academy/roster`} />}
        >
          <span className="font-medium">Roster and age groups</span>
          <span className="text-xs font-normal text-muted-foreground">
            Manage players, squads, and reports
          </span>
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col items-start gap-1 py-4"
          render={<Link href={`/admin/organisations/${organisationId}/academy/attendance`} />}
        >
          <span className="font-medium">Take attendance</span>
          <span className="text-xs font-normal text-muted-foreground">
            Four-tap, works offline at the pitch
          </span>
        </Button>
      </div>
    </Container>
  );
}
