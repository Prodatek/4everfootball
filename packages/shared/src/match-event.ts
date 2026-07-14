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
} as const;

export type MatchEventType = (typeof MatchEventType)[keyof typeof MatchEventType];

export const ALL_MATCH_EVENT_TYPES: MatchEventType[] = Object.values(MatchEventType);

export const GOAL_SCORING_EVENT_TYPES: MatchEventType[] = [
  MatchEventType.GOAL,
  MatchEventType.PENALTY_SCORED,
];

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
  createdAt: string;
}

export interface MatchLiveState {
  fixtureId: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  lastEvent: MatchEvent | null;
}
