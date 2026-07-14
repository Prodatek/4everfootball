import type { MatchEventType } from "@4ef/shared";

export const MATCH_EVENT_LABELS: Record<MatchEventType, string> = {
  KICKOFF: "Kickoff",
  GOAL: "Goal",
  SHOT: "Shot",
  SHOT_ON_TARGET: "Shot on target",
  SHOT_OFF_TARGET: "Shot off target",
  SAVE: "Save",
  CORNER: "Corner",
  FREE_KICK: "Free kick",
  THROW_IN: "Throw-in",
  PENALTY_AWARDED: "Penalty awarded",
  PENALTY_SCORED: "Penalty scored",
  PENALTY_MISSED: "Penalty missed",
  YELLOW_CARD: "Yellow card",
  RED_CARD: "Red card",
  SUBSTITUTION: "Substitution",
  INJURY: "Injury",
  VAR_DECISION: "VAR decision",
  OFFSIDE: "Offside",
  HALF_TIME: "Half time",
  FULL_TIME: "Full time",
};
