export interface StandingRow {
  position: number;
  teamId: string;
  teamName: string;
  teamSlug: string;
  teamLogoUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}
