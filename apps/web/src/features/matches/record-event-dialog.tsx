"use client";

import { useState } from "react";
import type { MatchEventType, Player } from "@4ef/shared";
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
import { MATCH_EVENT_LABELS } from "./event-labels";
import { EVENT_FIELD_REQUIREMENTS } from "./event-field-requirements";
import type { RecordMatchEventInput } from "./api";

interface TeamOption {
  id: string;
  name: string;
}

interface RecordEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventType: MatchEventType | null;
  homeTeam: TeamOption;
  awayTeam: TeamOption;
  squads: Record<string, Player[]>;
  defaultMinute: number;
  onConfirm: (input: RecordMatchEventInput) => void;
}

export function RecordEventDialog({
  open,
  onOpenChange,
  eventType,
  homeTeam,
  awayTeam,
  squads,
  defaultMinute,
  onConfirm,
}: RecordEventDialogProps) {
  // The parent remounts this component with a fresh `key` every time it's
  // opened, so these initial values are all that's needed to "reset" the
  // form — no effect-based reset required.
  const [teamId, setTeamId] = useState<string>("");
  const [playerId, setPlayerId] = useState<string>("");
  const [secondPlayerId, setSecondPlayerId] = useState<string>("");
  const [minute, setMinute] = useState(defaultMinute);

  if (!eventType) {
    return null;
  }

  const requirement = EVENT_FIELD_REQUIREMENTS[eventType];
  const needsTeam = requirement !== "none";
  const needsPlayer = requirement === "team-player" || requirement === "team-player-assist" || requirement === "team-player-sub";
  const needsAssist = requirement === "team-player-assist";
  const needsSubOff = requirement === "team-player-sub";
  const canConfirm =
    (!needsTeam || teamId) && (!needsPlayer || playerId);

  const squad = teamId ? (squads[teamId] ?? []) : [];

  function handleConfirm() {
    if (!eventType) return;

    onConfirm({
      clientEventId: crypto.randomUUID(),
      type: eventType,
      minute,
      teamId: needsTeam ? teamId : undefined,
      playerId: needsPlayer ? playerId : undefined,
      assistPlayerId: needsAssist && secondPlayerId ? secondPlayerId : undefined,
      metadata: needsSubOff && secondPlayerId ? { playerOffId: secondPlayerId } : undefined,
    });

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{MATCH_EVENT_LABELS[eventType]}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {needsTeam && (
            <div className="flex flex-col gap-2">
              <Label>Team</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={teamId === homeTeam.id ? "default" : "outline"}
                  onClick={() => {
                    setTeamId(homeTeam.id);
                    setPlayerId("");
                    setSecondPlayerId("");
                  }}
                >
                  {homeTeam.name}
                </Button>
                <Button
                  type="button"
                  variant={teamId === awayTeam.id ? "default" : "outline"}
                  onClick={() => {
                    setTeamId(awayTeam.id);
                    setPlayerId("");
                    setSecondPlayerId("");
                  }}
                >
                  {awayTeam.name}
                </Button>
              </div>
            </div>
          )}

          {needsPlayer && (
            <div className="flex flex-col gap-2">
              <Label>{needsSubOff ? "Player coming on" : "Player"}</Label>
              <Select value={playerId} onValueChange={(value) => setPlayerId(value ?? "")}>
                <SelectTrigger className="w-full" disabled={!teamId}>
                  <SelectValue placeholder={teamId ? "Select player" : "Select a team first"} />
                </SelectTrigger>
                <SelectContent>
                  {squad.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.firstName} {player.lastName}
                      {player.shirtNumber ? ` (#${player.shirtNumber})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(needsAssist || needsSubOff) && (
            <div className="flex flex-col gap-2">
              <Label>{needsSubOff ? "Player going off" : "Assist (optional)"}</Label>
              <Select
                value={secondPlayerId}
                onValueChange={(value) => setSecondPlayerId(value ?? "")}
              >
                <SelectTrigger className="w-full" disabled={!teamId}>
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  {squad
                    .filter((player) => player.id !== playerId)
                    .map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.firstName} {player.lastName}
                        {player.shirtNumber ? ` (#${player.shirtNumber})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="minute">Minute</Label>
            <Input
              id="minute"
              type="number"
              min={0}
              max={130}
              value={minute}
              onChange={(event) => setMinute(Number(event.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={!canConfirm} onClick={handleConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
