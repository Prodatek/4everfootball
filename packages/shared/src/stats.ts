export interface LeaderboardRow {
  playerId: string;
  playerName: string;
  playerSlug: string;
  count: number;
}

export interface PlayerStatsSummary {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  appearances: number;
}

export type FormResult = "W" | "D" | "L";

export interface TeamForm {
  teamId: string;
  results: FormResult[];
}
