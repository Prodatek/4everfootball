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
  correctsEventId: string | null;
  correctionReason: string | null;
  recordedById: string;
  prevHash: string;
  hash: string;
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

  get hash() {
    return this.props.hash;
  }

  /** The exact fields event-hash-chain.ts's HashableEventFields expects — nothing more. */
  toHashable() {
    return {
      id: this.props.id,
      fixtureId: this.props.fixtureId,
      type: this.props.type as string,
      minute: this.props.minute,
      stoppageMinute: this.props.stoppageMinute,
      teamId: this.props.teamId,
      playerId: this.props.playerId,
      assistPlayerId: this.props.assistPlayerId,
      metadata: this.props.metadata,
      clientEventId: this.props.clientEventId,
      correctsEventId: this.props.correctsEventId,
      correctionReason: this.props.correctionReason,
      recordedById: this.props.recordedById,
      createdAt: this.props.createdAt,
      prevHash: this.props.prevHash,
      hash: this.props.hash,
    };
  }

  toPublic() {
    return { ...this.props };
  }
}
