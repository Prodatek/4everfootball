"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import type { Player } from "@4ef/shared";
import { ALL_PLAYER_POSITIONS, ALL_PREFERRED_FEET } from "@4ef/shared";
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
import { fetchTeams } from "@/features/teams/api";
import { playerFormSchema, type PlayerFormValues } from "./schemas";
import type { PlayerInput } from "./api";

interface PlayerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player?: Player | null;
  onSubmit: (values: PlayerInput) => Promise<void>;
  isSubmitting: boolean;
}

function toDefaultValues(player?: Player | null): PlayerFormValues {
  return {
    firstName: player?.firstName ?? "",
    lastName: player?.lastName ?? "",
    dateOfBirth: player?.dateOfBirth ? player.dateOfBirth.slice(0, 10) : "",
    nationality: player?.nationality ?? "",
    position: player?.position ?? "",
    shirtNumber: player?.shirtNumber ?? "",
    heightCm: player?.heightCm ?? "",
    preferredFoot: player?.preferredFoot ?? "",
    photoUrl: player?.photoUrl ?? "",
    teamId: player?.teamId ?? "",
  };
}

export function PlayerFormDialog({
  open,
  onOpenChange,
  player,
  onSubmit,
  isSubmitting,
}: PlayerFormDialogProps) {
  const { data: teamsData } = useQuery({
    queryKey: ["teams", "for-select"],
    queryFn: () => fetchTeams({ limit: 100, sortBy: "name", sortOrder: "asc" }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PlayerFormValues>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: toDefaultValues(player),
  });

  useEffect(() => {
    if (open) {
      reset(toDefaultValues(player));
    }
  }, [open, player, reset]);

  async function handleFormSubmit(values: PlayerFormValues) {
    await onSubmit({
      firstName: values.firstName,
      lastName: values.lastName,
      dateOfBirth: values.dateOfBirth || undefined,
      nationality: values.nationality || undefined,
      position: (values.position || undefined) as PlayerInput["position"],
      shirtNumber:
        values.shirtNumber === "" || values.shirtNumber === undefined
          ? undefined
          : Number(values.shirtNumber),
      heightCm:
        values.heightCm === "" || values.heightCm === undefined
          ? undefined
          : Number(values.heightCm),
      preferredFoot: values.preferredFoot || undefined,
      photoUrl: values.photoUrl || undefined,
      teamId: values.teamId || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{player ? "Edit player" : "New player"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input id="nationality" {...register("nationality")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Position</Label>
              <Controller
                control={control}
                name="position"
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not set</SelectItem>
                      {ALL_PLAYER_POSITIONS.map((position) => (
                        <SelectItem key={position} value={position}>
                          {position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Preferred foot</Label>
              <Controller
                control={control}
                name="preferredFoot"
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select foot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not set</SelectItem>
                      {ALL_PREFERRED_FEET.map((foot) => (
                        <SelectItem key={foot} value={foot}>
                          {foot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="shirtNumber">Shirt number</Label>
              <Input id="shirtNumber" type="number" {...register("shirtNumber")} />
              {errors.shirtNumber && (
                <p className="text-sm text-destructive">{errors.shirtNumber.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="heightCm">Height (cm)</Label>
              <Input id="heightCm" type="number" {...register("heightCm")} />
              {errors.heightCm && (
                <p className="text-sm text-destructive">{errors.heightCm.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Team</Label>
            <Controller
              control={control}
              name="teamId"
              render={({ field }) => (
                <Select
                  value={field.value || "none"}
                  onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Free agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Free agent</SelectItem>
                    {teamsData?.data.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="photoUrl">Photo URL</Label>
            <Input id="photoUrl" {...register("photoUrl")} />
            {errors.photoUrl && (
              <p className="text-sm text-destructive">{errors.photoUrl.message}</p>
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
