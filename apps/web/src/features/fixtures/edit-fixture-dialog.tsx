"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import type { Fixture } from "@4ef/shared";
import { ADMIN_SETTABLE_FIXTURE_STATUSES } from "@4ef/shared";
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

function isAdminSettableStatus(
  status: Fixture["status"] | undefined,
): status is EditFixtureFormValues["status"] {
  return (ADMIN_SETTABLE_FIXTURE_STATUSES as readonly string[]).includes(
    status ?? "",
  );
}

function toDefaultValues(fixture: Fixture | null): EditFixtureFormValues {
  return {
    kickoffAt: fixture ? toDatetimeLocal(fixture.kickoffAt) : "",
    venueName: fixture?.venueName ?? "",
    matchday: fixture?.matchday ?? "",
    status: isAdminSettableStatus(fixture?.status) ? fixture.status : "SCHEDULED",
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

  // LIVE/FINISHED are match-engine transitions now, not admin-editable —
  // record a KICKOFF/FULL_TIME event (or a CORRECTION) to change them
  // instead. Disabling the field here rather than hiding it so it's obvious
  // *why* status can't be touched on a live/finished fixture, not just that
  // it's missing.
  const statusIsEngineControlled = fixture ? !isAdminSettableStatus(fixture.status) : false;

  async function handleFormSubmit(values: EditFixtureFormValues) {
    await onSubmit({
      kickoffAt: new Date(values.kickoffAt).toISOString(),
      venueName: values.venueName || undefined,
      matchday: values.matchday || undefined,
      // Omitted entirely (not just left at its default) when the current
      // status is engine-controlled, so submitting this form never
      // accidentally reverts a LIVE/FINISHED fixture back to SCHEDULED.
      status: statusIsEngineControlled ? undefined : values.status,
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
            {statusIsEngineControlled ? (
              <p className="text-sm text-muted-foreground">
                {fixture?.status} — set automatically by recorded match events, not editable here.
              </p>
            ) : (
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {ADMIN_SETTABLE_FIXTURE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
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
