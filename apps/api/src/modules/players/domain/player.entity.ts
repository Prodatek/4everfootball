import type { PlayerPosition, PreferredFoot } from '@prisma/client';

export interface PlayerTeamSummary {
  id: string;
  name: string;
  slug: string;
}

export interface PlayerProps {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  dateOfBirth: Date | null;
  nationality: string | null;
  position: PlayerPosition | null;
  shirtNumber: number | null;
  heightCm: number | null;
  preferredFoot: PreferredFoot | null;
  photoUrl: string | null;
  isActive: boolean;
  teamId: string | null;
  team: PlayerTeamSummary | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PlayerEntity {
  constructor(private readonly props: PlayerProps) {}

  get id() {
    return this.props.id;
  }

  get slug() {
    return this.props.slug;
  }

  toPublic() {
    return { ...this.props };
  }
}
