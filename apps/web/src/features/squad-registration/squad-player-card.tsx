"use client";

import { CheckCircle2, Circle } from "lucide-react";
import type { Player } from "@4ef/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EntityImage } from "@/components/media/entity-image";
import { isMinor } from "./guardian-consent";

interface SquadPlayerCardProps {
  player: Player;
  guardianConsentCaptured: boolean;
  onEdit: () => void;
  onRemove: () => void;
  isRemoving: boolean;
}

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

export function SquadPlayerCard({
  player,
  guardianConsentCaptured,
  onEdit,
  onRemove,
  isRemoving,
}: SquadPlayerCardProps) {
  const playerIsMinor = player.dateOfBirth ? isMinor(player.dateOfBirth) : false;

  // §5 B3: "show a completeness indicator per player so gaps are obvious at
  // a glance." Core fields always count; guardian consent only counts for
  // players who actually need it.
  const checks: { label: string; done: boolean }[] = [
    { label: "Date of birth", done: Boolean(player.dateOfBirth) },
    { label: "Position", done: Boolean(player.position) },
    { label: "Photo", done: Boolean(player.photoUrl) },
    ...(playerIsMinor
      ? [{ label: "Guardian consent", done: guardianConsentCaptured }]
      : []),
  ];
  const doneCount = checks.filter((c) => c.done).length;
  const isComplete = doneCount === checks.length;

  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-4">
        <EntityImage
          src={player.photoUrl}
          alt={`${player.firstName} ${player.lastName}`}
          fallback="player"
          className="size-14 shrink-0 rounded-md"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">
              {player.firstName} {player.lastName}
            </p>
            {playerIsMinor && (
              <span className="text-xs text-muted-foreground">
                ({player.dateOfBirth ? calculateAge(player.dateOfBirth) : "?"})
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {isComplete ? (
              <span className="flex items-center gap-1 text-live">
                <CheckCircle2 className="size-3.5" />
                Complete
              </span>
            ) : (
              checks
                .filter((c) => !c.done)
                .map((c) => (
                  <span
                    key={c.label}
                    className="flex items-center gap-1 text-muted-foreground"
                  >
                    <Circle className="size-3.5" />
                    {c.label} missing
                  </span>
                ))
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isRemoving}
            onClick={onRemove}
          >
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
