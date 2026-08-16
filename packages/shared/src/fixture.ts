export const FixtureStatus = {
  SCHEDULED: "SCHEDULED",
  LIVE: "LIVE",
  FINISHED: "FINISHED",
  POSTPONED: "POSTPONED",
  CANCELLED: "CANCELLED",
} as const;

export type FixtureStatus = (typeof FixtureStatus)[keyof typeof FixtureStatus];

export const ALL_FIXTURE_STATUSES: FixtureStatus[] = Object.values(FixtureStatus);

// The subset an admin can set directly via PATCH /fixtures/:id.
// SCHEDULED/POSTPONED/CANCELLED are scheduling decisions; LIVE/FINISHED are
// match-engine transitions that only happen as a side effect of recording a
// KICKOFF/FULL_TIME event (Phase 1, MONETISATION_BUILD_BRIEF.md — closing
// the bypass where an admin could previously PATCH a fixture straight to a
// score and status of their choosing with zero relationship to the event
// log).
export const ADMIN_SETTABLE_FIXTURE_STATUSES = [
  FixtureStatus.SCHEDULED,
  FixtureStatus.POSTPONED,
  FixtureStatus.CANCELLED,
] as const;
export type AdminSettableFixtureStatus =
  (typeof ADMIN_SETTABLE_FIXTURE_STATUSES)[number];

export interface FixtureTeamSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface FixtureCompetitionSummary {
  id: string;
  name: string;
  slug: string;
}

export interface Fixture {
  id: string;
  competitionId: string;
  competition: FixtureCompetitionSummary;
  homeTeamId: string;
  homeTeam: FixtureTeamSummary;
  awayTeamId: string;
  awayTeam: FixtureTeamSummary;
  kickoffAt: string;
  venueName: string | null;
  matchday: string | null;
  status: FixtureStatus;
  homeScore: number | null;
  awayScore: number | null;
  createdAt: string;
  updatedAt: string;
}
