"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchCompetitionsForAdmin, fetchCompetitionEntries } from "@/features/competitions/api";
import { createFixtureSchema, type CreateFixtureFormValues } from "./schemas";
import type { FixtureInput } from "./api";

interface CreateFixtureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FixtureInput) => Promise<void>;
  isSubmitting: boolean;
}

export function CreateFixtureDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: CreateFixtureDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<CreateFixtureFormValues>({
    resolver: zodResolver(createFixtureSchema),
    defaultValues: {
      competitionId: "",
      homeTeamId: "",
      awayTeamId: "",
      kickoffAt: "",
      venueName: "",
      matchday: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        competitionId: "",
        homeTeamId: "",
        awayTeamId: "",
        kickoffAt: "",
        venueName: "",
        matchday: "",
      });
    }
  }, [open, reset]);

  const competitionId = watch("competitionId");

  const { data: competitionsData } = useQuery({
    queryKey: ["competitions", "for-select"],
    queryFn: () => fetchCompetitionsForAdmin({ limit: 100, sortBy: "name" }),
    enabled: open,
  });

  const { data: entries } = useQuery({
    queryKey: ["competition-teams", competitionId],
    queryFn: () => fetchCompetitionEntries(competitionId),
    enabled: open && !!competitionId,
  });

  async function handleFormSubmit(values: CreateFixtureFormValues) {
    await onSubmit({
      competitionId: values.competitionId,
      homeTeamId: values.homeTeamId,
      awayTeamId: values.awayTeamId,
      kickoffAt: new Date(values.kickoffAt).toISOString(),
      venueName: values.venueName || undefined,
      matchday: values.matchday || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New fixture</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Competition</Label>
            <Controller
              control={control}
              name="competitionId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select competition" />
                  </SelectTrigger>
                  <SelectContent>
                    {competitionsData?.data.map((competition) => (
                      <SelectItem key={competition.id} value={competition.id}>
                        {competition.name} ({competition.season})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.competitionId && (
              <p className="text-sm text-destructive">{errors.competitionId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Home team</Label>
              <Controller
                control={control}
                name="homeTeamId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!competitionId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {entries?.map((entry) => (
                        <SelectItem key={entry.teamId} value={entry.teamId}>
                          {entry.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.homeTeamId && (
                <p className="text-sm text-destructive">{errors.homeTeamId.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Away team</Label>
              <Controller
                control={control}
                name="awayTeamId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!competitionId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {entries?.map((entry) => (
                        <SelectItem key={entry.teamId} value={entry.teamId}>
                          {entry.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.awayTeamId && (
                <p className="text-sm text-destructive">{errors.awayTeamId.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="kickoffAt">Kickoff</Label>
            <Input id="kickoffAt" type="datetime-local" {...register("kickoffAt")} />
            {errors.kickoffAt && (
              <p className="text-sm text-destructive">{errors.kickoffAt.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="venueName">Venue</Label>
              <Input id="venueName" {...register("venueName")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="matchday">Matchday</Label>
              <Input id="matchday" placeholder="Matchday 3" {...register("matchday")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Create fixture"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
