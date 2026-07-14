export const CompetitionType = {
  LEAGUE: "LEAGUE",
  CUP: "CUP",
  TOURNAMENT: "TOURNAMENT",
} as const;

export type CompetitionType = (typeof CompetitionType)[keyof typeof CompetitionType];

export const ALL_COMPETITION_TYPES: CompetitionType[] = Object.values(CompetitionType);

export interface Competition {
  id: string;
  name: string;
  slug: string;
  type: CompetitionType;
  country: string | null;
  season: string;
  startDate: string | null;
  endDate: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionEntryTeam {
  entryId: string;
  teamId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  joinedAt: string;
}
