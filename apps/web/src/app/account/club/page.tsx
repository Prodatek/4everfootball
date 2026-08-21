"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Container } from "@/components/layout/container";
import { useAuth } from "@/features/auth/auth-context";
import { createOrganisation, fetchMyOrganisations } from "@/features/organisations/api";
import { claimTeam, fetchTeams } from "@/features/teams/api";

const ORG_TYPES = [
  { value: "CLUB", label: "Club" },
  { value: "SCHOOL_LEAGUE", label: "School" },
  { value: "ACADEMY", label: "Academy" },
] as const;

const orgSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  type: z.enum(["CLUB", "SCHOOL_LEAGUE", "ACADEMY"], { message: "Select a type" }),
});
type OrgFormValues = z.infer<typeof orgSchema>;

// §5 B2, standalone: the embedded wizard at /register/[slug]/start bundles
// "create your club + claim your team" as one step inside a specific
// competition's registration flow — there was no way to do either ahead of
// time, independent of a competition, which is the exact gap the user
// reported directly. Same claimTeam()/createOrganisation() calls as that
// wizard, just reachable without picking a competition first.
export default function ClubAccountSetupPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [teamSearch, setTeamSearch] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  const { data: myOrgs, isLoading: orgsLoading } = useQuery({
    queryKey: ["my-organisations"],
    queryFn: fetchMyOrganisations,
    enabled: !!user,
  });

  const activeOrg = myOrgs?.[0] ?? null;

  const { data: myTeams, isLoading: myTeamsLoading } = useQuery({
    queryKey: ["organisation-teams", activeOrg?.id],
    queryFn: () => fetchTeams({ organisationId: activeOrg!.id, limit: 20 }),
    enabled: !!activeOrg,
  });

  const {
    register: registerOrgField,
    handleSubmit: handleOrgSubmit,
    control,
    formState: { errors: orgErrors },
  } = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: { type: "CLUB" },
  });

  const createOrgMutation = useMutation({
    mutationFn: (values: OrgFormValues) => createOrganisation({ name: values.name, type: values.type }),
    onSuccess: () => {
      toast.success("Account created");
      void queryClient.invalidateQueries({ queryKey: ["my-organisations"] });
    },
    onError: () => toast.error("Failed to create account"),
  });

  const { data: teamResults } = useQuery({
    queryKey: ["unclaimed-teams", teamSearch],
    queryFn: () => fetchTeams({ unclaimed: true, search: teamSearch, limit: 10 }),
    enabled: !!activeOrg && teamSearch.length >= 2,
  });

  const claimMutation = useMutation({
    mutationFn: (teamId: string) => claimTeam(teamId, activeOrg!.id),
    onSuccess: (team) => {
      toast.success(`${team.name} is now your team`);
      setTeamSearch("");
      void queryClient.invalidateQueries({ queryKey: ["organisation-teams", activeOrg?.id] });
    },
    onError: () => toast.error("Failed to claim this team — it may already belong to another club"),
  });

  if (authLoading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-6 py-10">
      <h1 className="font-heading text-2xl uppercase">Your club, school, or academy</h1>

      {orgsLoading && (
        <p className="text-sm text-muted-foreground">Checking your account...</p>
      )}

      {!orgsLoading && !activeOrg && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Set up your account</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleOrgSubmit((values) => createOrgMutation.mutate(values))}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="orgName">Name</Label>
                <Input id="orgName" placeholder="e.g. Lagos Comets FC" {...registerOrgField("name")} />
                {orgErrors.name && (
                  <p className="text-sm text-destructive">{orgErrors.name.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label>Type</Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type">
                          {(v: string) => ORG_TYPES.find((t) => t.value === v)?.label ?? "Select type"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ORG_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <Button type="submit" disabled={createOrgMutation.isPending}>
                {createOrgMutation.isPending ? "Creating..." : "Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeOrg && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your teams</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {myTeamsLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
              {!myTeamsLoading && myTeams?.data.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No team claimed yet — find and claim yours below.
                </p>
              )}
              {!myTeamsLoading && myTeams && myTeams.data.length > 0 && (
                <div className="flex flex-col gap-2">
                  {myTeams.data.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{team.name}</span>
                      <Link href={`/teams/${team.slug}`} className="text-xs underline underline-offset-4">
                        View team page
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Claim a team</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="teamSearch">Find your team</Label>
                <Input
                  id="teamSearch"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Search your team's name"
                />
                <p className="text-xs text-muted-foreground">
                  Can&apos;t find your team? Ask a competition organiser to add it first.
                </p>
              </div>

              {teamSearch.length >= 2 && (
                <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border border-border">
                  {teamResults && teamResults.data.length === 0 && (
                    <p className="p-3 text-sm text-muted-foreground">No unclaimed teams match.</p>
                  )}
                  {teamResults?.data.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      disabled={claimMutation.isPending}
                      onClick={() => claimMutation.mutate(team.id)}
                      className="flex items-center justify-between p-2.5 text-left text-sm hover:bg-accent"
                    >
                      <span className="font-medium">{team.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {claimMutation.isPending ? "Claiming..." : "Select"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {myTeams && myTeams.data.length > 0 && (
            <Button render={<Link href="/competitions" />} className="w-fit">
              Browse competitions to register for
            </Button>
          )}
        </>
      )}
    </Container>
  );
}
