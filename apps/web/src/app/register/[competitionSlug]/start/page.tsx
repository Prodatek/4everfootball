"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Container } from "@/components/layout/container";
import { Stepper } from "@/features/competitions/wizard/stepper";
import { useAuth } from "@/features/auth/auth-context";
import { registerSchema, type RegisterFormValues } from "@/features/auth/schemas";
import { fetchCompetitionBySlug } from "@/features/competitions/api";
import {
  createOrganisation,
  fetchMyOrganisations,
  type Organisation,
} from "@/features/organisations/api";
import { claimTeam, fetchTeams } from "@/features/teams/api";

const STEPS = ["Account", "Club", "Team"];

const orgSchema = z.object({
  name: z.string().min(2, "Club name is required").max(120),
});
type OrgFormValues = z.infer<typeof orgSchema>;

export default function StartRegistrationPage({
  params,
}: {
  params: Promise<{ competitionSlug: string }>;
}) {
  const { competitionSlug } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, register: registerUser } = useAuth();

  const [teamSearch, setTeamSearch] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Organisation | null>(null);

  const { data: competition } = useQuery({
    queryKey: ["competition", competitionSlug],
    queryFn: () => fetchCompetitionBySlug(competitionSlug),
  });

  const { data: myOrgs, isLoading: orgsLoading } = useQuery({
    queryKey: ["my-organisations"],
    queryFn: fetchMyOrganisations,
    enabled: !!user,
  });

  const activeOrg = selectedOrg ?? myOrgs?.[0] ?? null;

  // §5 B2: a team can now also be claimed ahead of time, outside this
  // wizard (/account/club) — if that already happened, searching
  // "unclaimed" teams here would never find it again (it's claimed), a
  // dead end. Skip straight to the squad builder for whichever team the
  // org already owns rather than showing a claim step that can't succeed.
  const { data: existingTeams, isLoading: existingTeamsLoading } = useQuery({
    queryKey: ["organisation-teams", activeOrg?.id],
    queryFn: () => fetchTeams({ organisationId: activeOrg!.id, limit: 1 }),
    enabled: !!activeOrg,
  });
  const existingTeam = existingTeams?.data[0] ?? null;

  useEffect(() => {
    if (existingTeam) {
      router.replace(`/register/${competitionSlug}/squad/${existingTeam.slug}`);
    }
  }, [existingTeam, competitionSlug, router]);

  // Step index derived from state, not tracked separately — each step's
  // own prerequisite (logged in, has a club, has no team yet) decides
  // whether it's shown.
  const step = !user ? 0 : !activeOrg ? 1 : 2;

  // --- Step 0: account ---
  const {
    register: registerField,
    handleSubmit: handleAccountSubmit,
    formState: { errors: accountErrors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  async function onAccountSubmit(values: RegisterFormValues) {
    setAccountSubmitting(true);
    setAccountError(null);
    try {
      await registerUser(values);
      toast.success("Account created");
    } catch (error) {
      const message = isAxiosError(error)
        ? (error.response?.data?.message ?? "Registration failed")
        : "Registration failed";
      setAccountError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setAccountSubmitting(false);
    }
  }

  // --- Step 1: club (organisation) ---
  const {
    register: registerOrgField,
    handleSubmit: handleOrgSubmit,
    formState: { errors: orgErrors },
  } = useForm<OrgFormValues>({ resolver: zodResolver(orgSchema) });

  const createOrgMutation = useMutation({
    mutationFn: (values: OrgFormValues) => createOrganisation({ name: values.name, type: "CLUB" }),
    onSuccess: (org) => {
      toast.success("Club account created");
      setSelectedOrg(org);
      void queryClient.invalidateQueries({ queryKey: ["my-organisations"] });
    },
    onError: () => toast.error("Failed to create club account"),
  });

  // --- Step 2: claim a team ---
  const { data: teamResults } = useQuery({
    queryKey: ["unclaimed-teams", teamSearch],
    queryFn: () => fetchTeams({ unclaimed: true, search: teamSearch, limit: 10 }),
    enabled: step === 2 && teamSearch.length >= 2,
  });

  const claimMutation = useMutation({
    mutationFn: (teamId: string) => claimTeam(teamId, activeOrg!.id),
    onSuccess: (team) => {
      toast.success(`${team.name} is now your club's team`);
      router.push(`/register/${competitionSlug}/squad/${team.slug}`);
    },
    onError: () => toast.error("Failed to claim this team — it may already belong to another club"),
  });

  if (authLoading || (step === 2 && (existingTeamsLoading || existingTeam))) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-6 py-10">
      <Button render={<Link href={`/register/${competitionSlug}`} />} variant="outline" className="w-fit">
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl uppercase">
            Register {competition ? `for ${competition.name}` : "your club"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Stepper steps={STEPS} currentStep={step} />

          {step === 0 && (
            <form onSubmit={handleAccountSubmit(onAccountSubmit)} className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                A club secretary account — takes under a minute.
              </p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="displayName">Your name</Label>
                <Input id="displayName" autoComplete="name" {...registerField("displayName")} />
                {accountErrors.displayName && (
                  <p className="text-sm text-destructive">{accountErrors.displayName.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...registerField("email")} />
                {accountErrors.email && (
                  <p className="text-sm text-destructive">{accountErrors.email.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...registerField("password")}
                />
                {accountErrors.password && (
                  <p className="text-sm text-destructive">{accountErrors.password.message}</p>
                )}
              </div>
              {accountError && <p className="text-sm text-destructive">{accountError}</p>}
              <Button type="submit" disabled={accountSubmitting}>
                {accountSubmitting ? "Creating account..." : "Continue"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already registered? <Link href="/login" className="underline">Log in</Link>
              </p>
            </form>
          )}

          {step === 1 && (
            <form
              onSubmit={handleOrgSubmit((values) => createOrgMutation.mutate(values))}
              className="flex flex-col gap-4"
            >
              {orgsLoading ? (
                <p className="text-sm text-muted-foreground">Checking your account...</p>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="clubName">Club name</Label>
                    <Input id="clubName" placeholder="e.g. Lagos Comets FC" {...registerOrgField("name")} />
                    {orgErrors.name && (
                      <p className="text-sm text-destructive">{orgErrors.name.message}</p>
                    )}
                  </div>
                  <Button type="submit" disabled={createOrgMutation.isPending}>
                    {createOrgMutation.isPending ? "Creating..." : "Continue"}
                  </Button>
                </>
              )}
            </form>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="teamSearch">Find your team</Label>
                <Input
                  id="teamSearch"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Search your club's team name"
                />
                <p className="text-xs text-muted-foreground">
                  Can&apos;t find your team? Ask the competition organiser to add it first.
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
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
