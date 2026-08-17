"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { COMPETITION_TIERS, type CompetitionTierKey, ALL_COMPETITION_TYPES } from "@4ef/shared";
import { Badge } from "@/components/ui/badge";
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
import { Money } from "@/components/monetisation/money";
import { createCompetition, setCompetitionTier } from "@/features/competitions/api";
import { Stepper } from "./stepper";

const STEPS = ["Basics", "Team count", "Tier", "Review"];

interface WizardData {
  name: string;
  type: (typeof ALL_COMPETITION_TYPES)[number];
  season: string;
  country: string;
  startDate: string;
  endDate: string;
  expectedTeamCount: string;
  tier: CompetitionTierKey;
  tierTouched: boolean;
}

function recommendTier(teamCount: number): CompetitionTierKey {
  const entries = Object.entries(COMPETITION_TIERS) as [
    CompetitionTierKey,
    (typeof COMPETITION_TIERS)[CompetitionTierKey],
  ][];
  const match = entries.find(
    ([, tier]) => teamCount >= tier.minTeams && (tier.maxTeams === null || teamCount <= tier.maxTeams),
  );
  return match ? match[0] : "FEDERATION";
}

export function CompetitionWizard({
  organisationId,
  organisationName,
}: {
  organisationId: string;
  organisationName: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({
    name: "",
    type: "LEAGUE",
    season: new Date().getFullYear().toString(),
    country: "Nigeria",
    startDate: "",
    endDate: "",
    expectedTeamCount: "",
    tier: "COMMUNITY",
    tierTouched: false,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const competition = await createCompetition({
        name: data.name,
        type: data.type,
        season: data.season,
        country: data.country || undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        organisationId,
      });
      await setCompetitionTier(competition.id, data.tier);
      return competition;
    },
    onSuccess: (competition) => {
      toast.success("Competition created");
      router.push(`/admin/organisations/${organisationId}`);
      void competition;
    },
    onError: () => toast.error("Failed to create competition"),
  });

  function setTeamCount(value: string) {
    setData((d) => {
      const next = { ...d, expectedTeamCount: value };
      if (!d.tierTouched) {
        const n = Number(value);
        if (value !== "" && !Number.isNaN(n)) {
          next.tier = recommendTier(n);
        }
      }
      return next;
    });
  }

  const canProceed =
    step === 0 ? data.name.trim().length > 1 && data.season.trim().length > 0 : true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl uppercase">New competition</CardTitle>
        <p className="text-sm text-muted-foreground">for {organisationName}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Stepper steps={STEPS} currentStep={step} />

        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="wiz-name">Competition name</Label>
              <Input
                id="wiz-name"
                value={data.name}
                onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Lagos Youth League"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Format</Label>
                <Select
                  value={data.type}
                  onValueChange={(value) =>
                    setData((d) => ({ ...d, type: value as WizardData["type"] }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_COMPETITION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="wiz-season">Season</Label>
                <Input
                  id="wiz-season"
                  value={data.season}
                  onChange={(e) => setData((d) => ({ ...d, season: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="wiz-start">Start date</Label>
                <Input
                  id="wiz-start"
                  type="date"
                  value={data.startDate}
                  onChange={(e) => setData((d) => ({ ...d, startDate: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="wiz-end">End date</Label>
                <Input
                  id="wiz-end"
                  type="date"
                  value={data.endDate}
                  onChange={(e) => setData((d) => ({ ...d, endDate: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="wiz-teams">Expected number of teams</Label>
              <Input
                id="wiz-teams"
                type="number"
                min={0}
                value={data.expectedTeamCount}
                onChange={(e) => setTeamCount(e.target.value)}
                placeholder="e.g. 34"
              />
              <p className="text-xs text-muted-foreground">
                A rough count is fine — this only decides which tier we recommend next. You can
                change it there.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            {data.expectedTeamCount && (
              <p className="text-sm text-muted-foreground">
                Based on <span className="font-medium text-foreground">{data.expectedTeamCount} teams</span>,{" "}
                <span className="font-medium text-foreground">
                  {COMPETITION_TIERS[recommendTier(Number(data.expectedTeamCount))].label}
                </span>{" "}
                tier.
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(Object.entries(COMPETITION_TIERS) as [CompetitionTierKey, (typeof COMPETITION_TIERS)[CompetitionTierKey]][]).map(
                ([key, tier]) => {
                  const isSelected = data.tier === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setData((d) => ({ ...d, tier: key, tierTouched: true }))}
                      className={`flex flex-col items-start gap-2 rounded-xl p-4 text-left ring-1 transition-colors ${
                        isSelected
                          ? "bg-primary/10 ring-2 ring-primary"
                          : "ring-foreground/10 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-heading text-lg uppercase">{tier.label}</span>
                        {isSelected && <Badge>Selected</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {tier.minTeams}
                        {tier.maxTeams ? `–${tier.maxTeams}` : "+"} teams
                      </p>
                      <p className="font-heading text-xl">
                        <Money kobo={tier.priceKobo} />
                      </p>
                    </button>
                  );
                },
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{data.name}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Format</span>
              <span className="font-medium">{data.type}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Season</span>
              <span className="font-medium">{data.season}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Tier</span>
              <span className="font-medium">{COMPETITION_TIERS[data.tier].label}</span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-muted-foreground">Licence fee</span>
              <span className="font-heading text-lg">
                <Money kobo={COMPETITION_TIERS[data.tier].priceKobo} />
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" disabled={!canProceed} onClick={() => setStep((s) => s + 1)}>
              Next
            </Button>
          ) : (
            <Button
              type="button"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Creating..." : "Create competition"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
