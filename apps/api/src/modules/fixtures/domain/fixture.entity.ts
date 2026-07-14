import type { FixtureStatus } from '@prisma/client';

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

export interface FixtureProps {
  id: string;
  competitionId: string;
  competition: FixtureCompetitionSummary;
  homeTeamId: string;
  homeTeam: FixtureTeamSummary;
  awayTeamId: string;
  awayTeam: FixtureTeamSummary;
  kickoffAt: Date;
  venueName: string | null;
  matchday: string | null;
  status: FixtureStatus;
  homeScore: number | null;
  awayScore: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export class FixtureEntity {
  constructor(private readonly props: FixtureProps) {}

  get id() {
    return this.props.id;
  }

  get homeTeamId() {
    return this.props.homeTeamId;
  }

  get awayTeamId() {
    return this.props.awayTeamId;
  }

  toPublic() {
    return { ...this.props };
  }
}
