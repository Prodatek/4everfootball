export const PlayerPosition = {
  GOALKEEPER: "GOALKEEPER",
  DEFENDER: "DEFENDER",
  MIDFIELDER: "MIDFIELDER",
  FORWARD: "FORWARD",
} as const;

export type PlayerPosition = (typeof PlayerPosition)[keyof typeof PlayerPosition];

export const ALL_PLAYER_POSITIONS: PlayerPosition[] = Object.values(PlayerPosition);

export const PreferredFoot = {
  LEFT: "LEFT",
  RIGHT: "RIGHT",
  BOTH: "BOTH",
} as const;

export type PreferredFoot = (typeof PreferredFoot)[keyof typeof PreferredFoot];

export const ALL_PREFERRED_FEET: PreferredFoot[] = Object.values(PreferredFoot);

export interface PlayerTeamSummary {
  id: string;
  name: string;
  slug: string;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  dateOfBirth: string | null;
  nationality: string | null;
  position: PlayerPosition | null;
  shirtNumber: number | null;
  heightCm: number | null;
  preferredFoot: PreferredFoot | null;
  photoUrl: string | null;
  isActive: boolean;
  teamId: string | null;
  team: PlayerTeamSummary | null;
  createdAt: string;
  updatedAt: string;
}
