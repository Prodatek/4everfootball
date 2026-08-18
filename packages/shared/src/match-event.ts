export const MatchEventType = {
  KICKOFF: "KICKOFF",
  GOAL: "GOAL",
  SHOT: "SHOT",
  SHOT_ON_TARGET: "SHOT_ON_TARGET",
  SHOT_OFF_TARGET: "SHOT_OFF_TARGET",
  SAVE: "SAVE",
  CORNER: "CORNER",
  FREE_KICK: "FREE_KICK",
  THROW_IN: "THROW_IN",
  PENALTY_AWARDED: "PENALTY_AWARDED",
  PENALTY_SCORED: "PENALTY_SCORED",
  PENALTY_MISSED: "PENALTY_MISSED",
  YELLOW_CARD: "YELLOW_CARD",
  RED_CARD: "RED_CARD",
  SUBSTITUTION: "SUBSTITUTION",
  INJURY: "INJURY",
  VAR_DECISION: "VAR_DECISION",
  OFFSIDE: "OFFSIDE",
  HALF_TIME: "HALF_TIME",
  FULL_TIME: "FULL_TIME",
  // Append-only correction mechanism (MONETISATION_BUILD_BRIEF.md Phase 1):
  // a mistake is never fixed by editing or deleting the original event, it's
  // fixed by recording one of these pointing at it via correctsEventId.
  // Deliberately excluded from ALL_MATCH_EVENT_TYPES below — neither
  // apps/web nor apps/mobile has a "which event does this correct" picker
  // yet, so these aren't offered in the quick-record grid. Filing one today
  // requires a direct API call.
  CORRECTION: "CORRECTION",
  NOTE: "NOTE",
} as const;

export type MatchEventType = (typeof MatchEventType)[keyof typeof MatchEventType];

// The quick-record grid list — deliberately not Object.values(MatchEventType),
// see the CORRECTION/NOTE comment above.
export const ALL_MATCH_EVENT_TYPES: MatchEventType[] = [
  MatchEventType.KICKOFF,
  MatchEventType.GOAL,
  MatchEventType.SHOT,
  MatchEventType.SHOT_ON_TARGET,
  MatchEventType.SHOT_OFF_TARGET,
  MatchEventType.SAVE,
  MatchEventType.CORNER,
  MatchEventType.FREE_KICK,
  MatchEventType.THROW_IN,
  MatchEventType.PENALTY_AWARDED,
  MatchEventType.PENALTY_SCORED,
  MatchEventType.PENALTY_MISSED,
  MatchEventType.YELLOW_CARD,
  MatchEventType.RED_CARD,
  MatchEventType.SUBSTITUTION,
  MatchEventType.INJURY,
  MatchEventType.VAR_DECISION,
  MatchEventType.OFFSIDE,
  MatchEventType.HALF_TIME,
  MatchEventType.FULL_TIME,
];

export const GOAL_SCORING_EVENT_TYPES: MatchEventType[] = [
  MatchEventType.GOAL,
  MatchEventType.PENALTY_SCORED,
];

// Corrections retract a prior event's effect on derived state (score/status)
// without altering or removing the original row, which stays visible in the
// timeline forever. This is the only correction semantics Phase 1
// implements — "replace this event's values" is a larger, separate design
// not built here.
export interface RetractCorrectionMetadata {
  action: "RETRACT";
}

export interface MatchEventPlayerSummary {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
}

export interface MatchEvent {
  id: string;
  sequence: number;
  fixtureId: string;
  type: MatchEventType;
  minute: number;
  stoppageMinute: number | null;
  teamId: string | null;
  playerId: string | null;
  player: MatchEventPlayerSummary | null;
  assistPlayerId: string | null;
  assistPlayer: MatchEventPlayerSummary | null;
  metadata: Record<string, unknown> | null;
  clientEventId: string;
  correctsEventId: string | null;
  correctionReason: string | null;
  prevHash: string;
  hash: string;
  createdAt: string;
}

export interface VerifyMatchEventsResult {
  valid: boolean;
  events: number;
  firstHash: string | null;
  lastHash: string | null;
  verifiedAt: string;
  brokenAtEventId?: string;
  // §5 C3 of MONETISATION_UI_BRIEF.md's verification panel — every distinct
  // recorder across the match's events, not just the first (a substitute
  // scout or a later correction can add a second name).
  recordedBy: string[];
}

export interface MatchLiveState {
  fixtureId: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  lastEvent: MatchEvent | null;
}
