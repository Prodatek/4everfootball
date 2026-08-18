"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { MatchEventType, Player } from "@4ef/shared";
import { Button } from "@/components/ui/button";
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

interface EventCapturePanelProps {
  eventType: MatchEventType;
  presetTeamId?: string;
  homeTeam: TeamOption;
  awayTeam: TeamOption;
  squads: Record<string, Player[]>;
  defaultMinute: number;
  onConfirm: (input: RecordMatchEventInput) => void;
  onDismiss: () => void;
}

/**
 * Brief §4.4: "Never show a blocking modal in the recorder... use inline
 * banners and toasts only." This is that fix — a plain fixed-position
 * panel, not the Dialog/Sheet primitives (both wrap the same modal/backdrop
 * mechanism under the hood). No backdrop, nothing traps focus or pointer
 * events elsewhere on the screen: the score header and every other primary
 * button stay visible and tappable while this is open. Tapping a different
 * primary button replaces this panel's event entirely — a goal never has
 * to wait for a card's details to be dismissed first.
 */
export function EventCapturePanel({
  eventType,
  presetTeamId,
  homeTeam,
  awayTeam,
  squads,
  defaultMinute,
  onConfirm,
  onDismiss,
}: EventCapturePanelProps) {
  const [teamId, setTeamId] = useState(presetTeamId ?? "");
  const [playerId, setPlayerId] = useState("");
  const [secondPlayerId, setSecondPlayerId] = useState("");
  const [minute, setMinute] = useState(defaultMinute);

  useEffect(() => {
    setTeamId(presetTeamId ?? "");
    setPlayerId("");
    setSecondPlayerId("");
    setMinute(defaultMinute);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, presetTeamId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  const requirement = EVENT_FIELD_REQUIREMENTS[eventType];
  const needsTeam = requirement !== "none";
  const needsPlayer =
    requirement === "team-player" ||
    requirement === "team-player-assist" ||
    requirement === "team-player-sub";
  const needsAssist = requirement === "team-player-assist";
  const needsSubOff = requirement === "team-player-sub";
  const canConfirm = (!needsTeam || teamId) && (!needsPlayer || playerId);
  const squad = teamId ? (squads[teamId] ?? []) : [];

  function handleConfirm() {
    onConfirm({
      clientEventId: crypto.randomUUID(),
      type: eventType,
      minute,
      teamId: needsTeam ? teamId : undefined,
      playerId: needsPlayer ? playerId : undefined,
      assistPlayerId: needsAssist && secondPlayerId ? secondPlayerId : undefined,
      metadata: needsSubOff && secondPlayerId ? { playerOffId: secondPlayerId } : undefined,
    });
    onDismiss();
  }

  return (
    <div
      role="region"
      aria-label={`Record ${MATCH_EVENT_LABELS[eventType]}`}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[65vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-t-xl border border-border bg-card p-4 shadow-lg ring-1 ring-foreground/10"
    >
      <div className="flex items-center justify-between">
        <p className="font-heading text-lg uppercase">{MATCH_EVENT_LABELS[eventType]}</p>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onDismiss} aria-label="Dismiss">
          <X className="size-4" />
        </Button>
      </div>

      {needsTeam && !presetTeamId && (
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
            <SelectTrigger className="h-11 w-full" disabled={!teamId}>
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
          <Select value={secondPlayerId} onValueChange={(value) => setSecondPlayerId(value ?? "")}>
            <SelectTrigger className="h-11 w-full" disabled={!teamId}>
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
        <Label htmlFor="capture-minute">Minute</Label>
        <Input
          id="capture-minute"
          type="number"
          min={0}
          max={130}
          className="h-11"
          value={minute}
          onChange={(event) => setMinute(Number(event.target.value))}
        />
      </div>

      <Button size="lg" disabled={!canConfirm} onClick={handleConfirm} className="h-14 text-base">
        Confirm {MATCH_EVENT_LABELS[eventType].toLowerCase()}
      </Button>
    </div>
  );
}
