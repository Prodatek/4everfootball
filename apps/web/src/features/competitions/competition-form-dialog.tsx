"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import type { Competition } from "@4ef/shared";
import { ALL_COMPETITION_TYPES, CompetitionType } from "@4ef/shared";
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
import { competitionFormSchema, type CompetitionFormValues } from "./schemas";
import type { CompetitionInput } from "./api";

interface CompetitionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competition?: Competition | null;
  onSubmit: (values: CompetitionInput) => Promise<void>;
  isSubmitting: boolean;
}

function toDefaultValues(competition?: Competition | null): CompetitionFormValues {
  return {
    name: competition?.name ?? "",
    type: competition?.type ?? CompetitionType.LEAGUE,
    season: competition?.season ?? "",
    country: competition?.country ?? "",
    startDate: competition?.startDate ? competition.startDate.slice(0, 10) : "",
    endDate: competition?.endDate ? competition.endDate.slice(0, 10) : "",
    logoUrl: competition?.logoUrl ?? "",
  };
}

export function CompetitionFormDialog({
  open,
  onOpenChange,
  competition,
  onSubmit,
  isSubmitting,
}: CompetitionFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CompetitionFormValues>({
    resolver: zodResolver(competitionFormSchema),
    defaultValues: toDefaultValues(competition),
  });

  useEffect(() => {
    if (open) {
      reset(toDefaultValues(competition));
    }
  }, [open, competition, reset]);

  async function handleFormSubmit(values: CompetitionFormValues) {
    await onSubmit({
      name: values.name,
      type: values.type as CompetitionInput["type"],
      season: values.season,
      country: values.country || undefined,
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined,
      logoUrl: values.logoUrl || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{competition ? "Edit competition" : "New competition"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_COMPETITION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="season">Season</Label>
              <Input id="season" placeholder="2025/2026" {...register("season")} />
              {errors.season && (
                <p className="text-sm text-destructive">{errors.season.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" {...register("country")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" type="date" {...register("endDate")} />
            </div>
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
