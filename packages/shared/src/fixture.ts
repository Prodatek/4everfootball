export const FixtureStatus = {
  SCHEDULED: "SCHEDULED",
  LIVE: "LIVE",
  FINISHED: "FINISHED",
  POSTPONED: "POSTPONED",
  CANCELLED: "CANCELLED",
} as const;

export type FixtureStatus = (typeof FixtureStatus)[keyof typeof FixtureStatus];

export const ALL_FIXTURE_STATUSES: FixtureStatus[] = Object.values(FixtureStatus);

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
