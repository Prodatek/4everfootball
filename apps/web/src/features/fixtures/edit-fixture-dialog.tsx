"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import type { Fixture } from "@4ef/shared";
import { ALL_FIXTURE_STATUSES } from "@4ef/shared";
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
import { editFixtureSchema, type EditFixtureFormValues } from "./schemas";
import type { FixtureUpdateInput } from "./api";

interface EditFixtureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fixture: Fixture | null;
  onSubmit: (values: FixtureUpdateInput) => Promise<void>;
  isSubmitting: boolean;
}

function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toDefaultValues(fixture: Fixture | null): EditFixtureFormValues {
  return {
    kickoffAt: fixture ? toDatetimeLocal(fixture.kickoffAt) : "",
    venueName: fixture?.venueName ?? "",
    matchday: fixture?.matchday ?? "",
    status: fixture?.status ?? "SCHEDULED",
    homeScore: fixture?.homeScore ?? "",
    awayScore: fixture?.awayScore ?? "",
  };
}

export function EditFixtureDialog({
  open,
  onOpenChange,
  fixture,
  onSubmit,
  isSubmitting,
}: EditFixtureDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<EditFixtureFormValues>({
    resolver: zodResolver(editFixtureSchema),
    defaultValues: toDefaultValues(fixture),
  });

  useEffect(() => {
    if (open) {
      reset(toDefaultValues(fixture));
    }
  }, [open, fixture, reset]);

  async function handleFormSubmit(values: EditFixtureFormValues) {
    await onSubmit({
      kickoffAt: new Date(values.kickoffAt).toISOString(),
      venueName: values.venueName || undefined,
      matchday: values.matchday || undefined,
      status: values.status as FixtureUpdateInput["status"],
      homeScore:
        values.homeScore === "" || values.homeScore === undefined
          ? undefined
          : Number(values.homeScore),
      awayScore:
        values.awayScore === "" || values.awayScore === undefined
          ? undefined
          : Number(values.awayScore),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {fixture ? `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}` : "Edit fixture"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="kickoffAt">Kickoff</Label>
            <Input id="kickoffAt" type="datetime-local" {...register("kickoffAt")} />
            {errors.kickoffAt && (
              <p className="text-sm text-destructive">{errors.kickoffAt.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_FIXTURE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="homeScore">Home score</Label>
              <Input id="homeScore" type="number" {...register("homeScore")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="awayScore">Away score</Label>
              <Input id="awayScore" type="number" {...register("awayScore")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="venueName">Venue</Label>
              <Input id="venueName" {...register("venueName")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="matchday">Matchday</Label>
              <Input id="matchday" {...register("matchday")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
