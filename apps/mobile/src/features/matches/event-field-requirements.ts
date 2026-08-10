import type { MatchEventType } from "@4ef/shared";

export type EventFieldRequirement =
  | "none"
  | "team"
  | "team-player"
  | "team-player-assist"
  | "team-player-sub";

export const EVENT_FIELD_REQUIREMENTS: Record<MatchEventType, EventFieldRequirement> = {
  KICKOFF: "none",
  HALF_TIME: "none",
  FULL_TIME: "none",
  CORNER: "team",
  OFFSIDE: "team",
  VAR_DECISION: "team",
  SHOT: "team-player",
  SHOT_ON_TARGET: "team-player",
  SHOT_OFF_TARGET: "team-player",
  SAVE: "team-player",
  FREE_KICK: "team-player",
  THROW_IN: "team-player",
  PENALTY_AWARDED: "team-player",
  PENALTY_MISSED: "team-player",
  YELLOW_CARD: "team-player",
  RED_CARD: "team-player",
  INJURY: "team-player",
  GOAL: "team-player-assist",
  PENALTY_SCORED: "team-player-assist",
  SUBSTITUTION: "team-player-sub",
};
