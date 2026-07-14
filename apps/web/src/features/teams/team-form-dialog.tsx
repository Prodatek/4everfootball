"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Team } from "@4ef/shared";
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
import { teamFormSchema, type TeamFormValues } from "./schemas";
import type { TeamInput } from "./api";

interface TeamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team?: Team | null;
  onSubmit: (values: TeamInput) => Promise<void>;
  isSubmitting: boolean;
}

function toDefaultValues(team?: Team | null): TeamFormValues {
  return {
    name: team?.name ?? "",
    shortName: team?.shortName ?? "",
    country: team?.country ?? "",
    foundedYear: team?.foundedYear ?? "",
    logoUrl: team?.logoUrl ?? "",
    venueName: team?.venueName ?? "",
  };
}

export function TeamFormDialog({
  open,
  onOpenChange,
  team,
  onSubmit,
  isSubmitting,
}: TeamFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: toDefaultValues(team),
  });

  useEffect(() => {
    if (open) {
      reset(toDefaultValues(team));
    }
  }, [open, team, reset]);

  async function handleFormSubmit(values: TeamFormValues) {
    await onSubmit({
      name: values.name,
      shortName: values.shortName || undefined,
      country: values.country || undefined,
      foundedYear:
        values.foundedYear === "" || values.foundedYear === undefined
          ? undefined
          : Number(values.foundedYear),
      logoUrl: values.logoUrl || undefined,
      venueName: values.venueName || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{team ? "Edit team" : "New team"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="shortName">Short name</Label>
            <Input id="shortName" {...register("shortName")} />
            {errors.shortName && (
              <p className="text-sm text-destructive">{errors.shortName.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" {...register("country")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="foundedYear">Founded year</Label>
            <Input id="foundedYear" type="number" {...register("foundedYear")} />
            {errors.foundedYear && (
              <p className="text-sm text-destructive">{errors.foundedYear.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="venueName">Venue</Label>
            <Input id="venueName" {...register("venueName")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input id="logoUrl" {...register("logoUrl")} />
            {errors.logoUrl && (
              <p className="text-sm text-destructive">{errors.logoUrl.message}</p>
            )}
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
