import type { MatchEventType } from '@prisma/client';

export interface ScoreDeriverEvent {
  id: string;
  type: MatchEventType;
  teamId: string | null;
  correctsEventId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface DerivedScore {
  homeScore: number;
  awayScore: number;
}

const GOAL_SCORING_TYPES: MatchEventType[] = ['GOAL', 'PENALTY_SCORED'];

/**
 * A CORRECTION event with metadata.action === 'RETRACT' removes the
 * corrected event's effect on the score without touching the original row —
 * the original stays in the timeline, it's just excluded from this
 * recomputation. See packages/shared/src/match-event.ts's
 * RetractCorrectionMetadata and the Phase 1 report for why RETRACT is the
 * only correction semantics implemented (not a full "replace the values").
 */
function retractedEventIds(events: ScoreDeriverEvent[]): Set<string> {
  const retracted = new Set<string>();

  for (const event of events) {
    if (
      event.type === 'CORRECTION' &&
      event.correctsEventId &&
      event.metadata?.action === 'RETRACT'
    ) {
      retracted.add(event.correctsEventId);
    }
  }

  return retracted;
}

export function deriveScore(
  events: ScoreDeriverEvent[],
  homeTeamId: string,
  awayTeamId: string,
): DerivedScore {
  const retracted = retractedEventIds(events);
  let homeScore = 0;
  let awayScore = 0;

  for (const event of events) {
    if (retracted.has(event.id)) {
      continue;
    }

    if (!GOAL_SCORING_TYPES.includes(event.type)) {
      continue;
    }

    if (event.teamId === homeTeamId) {
      homeScore += 1;
    } else if (event.teamId === awayTeamId) {
      awayScore += 1;
    }
    // An event whose teamId matches neither fixture team is ignored rather than
    // thrown on: this function must stay total, and recordEvent() is what's
    // responsible for rejecting invalid teamId values before they're ever stored.
  }

  return { homeScore, awayScore };
}
