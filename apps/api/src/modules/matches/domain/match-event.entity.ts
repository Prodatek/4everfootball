import type { MatchEventType, Prisma } from '@prisma/client';

export interface MatchEventPlayerSummary {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
}

export interface MatchEventProps {
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
  metadata: Prisma.JsonValue | null;
  clientEventId: string;
  createdAt: Date;
}

export class MatchEventEntity {
  constructor(private readonly props: MatchEventProps) {}

  get id() {
    return this.props.id;
  }

  get fixtureId() {
    return this.props.fixtureId;
  }

  get type() {
    return this.props.type;
  }

  get teamId() {
    return this.props.teamId;
  }

  toPublic() {
    return { ...this.props };
  }
}
