"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import type { Player } from "@4ef/shared";
import { ALL_PLAYER_POSITIONS } from "@4ef/shared";
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
import { squadPlayerFormSchema, type SquadPlayerFormValues } from "./schemas";
import { SquadPlayerPhotoField } from "./squad-player-photo-field";
import { isMinor } from "./guardian-consent";

export interface SquadPlayerSubmitValues {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  position?: string;
  photoUrl?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
}

interface SquadPlayerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player?: Player | null;
  onSubmit: (values: SquadPlayerSubmitValues) => Promise<void>;
  isSubmitting: boolean;
}

function toDefaultValues(player?: Player | null): SquadPlayerFormValues {
  return {
    firstName: player?.firstName ?? "",
    lastName: player?.lastName ?? "",
    dateOfBirth: player?.dateOfBirth ? player.dateOfBirth.slice(0, 10) : "",
    position: player?.position ?? "",
    photoUrl: player?.photoUrl ?? "",
    guardianName: "",
    guardianPhone: "",
    guardianEmail: "",
  };
}

export function SquadPlayerFormDialog({
  open,
  onOpenChange,
  player,
  onSubmit,
  isSubmitting,
}: SquadPlayerFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<SquadPlayerFormValues>({
    resolver: zodResolver(squadPlayerFormSchema),
    defaultValues: toDefaultValues(player),
  });

  useEffect(() => {
    if (open) {
      reset(toDefaultValues(player));
    }
  }, [open, player, reset]);

  const dateOfBirth = watch("dateOfBirth");
  const showGuardianFields = Boolean(dateOfBirth && isMinor(dateOfBirth));

  async function handleFormSubmit(values: SquadPlayerFormValues) {
    await onSubmit({
      firstName: values.firstName,
      lastName: values.lastName,
      dateOfBirth: values.dateOfBirth,
      position: values.position || undefined,
      photoUrl: values.photoUrl || undefined,
      guardianName: values.guardianName || undefined,
      guardianPhone: values.guardianPhone || undefined,
      guardianEmail: values.guardianEmail || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{player ? "Edit player" : "Add player"}</DialogTitle>
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
              {errors.dateOfBirth && (
                <p className="text-sm text-destructive">{errors.dateOfBirth.message}</p>
              )}
            </div>
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
          </div>

          <Controller
            control={control}
            name="photoUrl"
            render={({ field }) => (
              <SquadPlayerPhotoField
                value={field.value || undefined}
                onChange={(url) => field.onChange(url ?? "")}
              />
            )}
          />

          {showGuardianFields && (
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                This player is under 18 — a parent or guardian&apos;s name plus a phone
                number or email is required before they can be registered.
              </p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="guardianName">Guardian name</Label>
                <Input id="guardianName" {...register("guardianName")} />
                {errors.guardianName && (
                  <p className="text-sm text-destructive">{errors.guardianName.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="guardianPhone">Guardian phone</Label>
                  <Input id="guardianPhone" {...register("guardianPhone")} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="guardianEmail">Guardian email</Label>
                  <Input id="guardianEmail" {...register("guardianEmail")} />
                  {errors.guardianEmail && (
                    <p className="text-sm text-destructive">{errors.guardianEmail.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save player"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
