import type { MatchEventType } from '@prisma/client';

export interface ScoreDeriverEvent {
  type: MatchEventType;
  teamId: string | null;
}

export interface DerivedScore {
  homeScore: number;
  awayScore: number;
}

const GOAL_SCORING_TYPES: MatchEventType[] = ['GOAL', 'PENALTY_SCORED'];

export function deriveScore(
  events: ScoreDeriverEvent[],
  homeTeamId: string,
  awayTeamId: string,
): DerivedScore {
  let homeScore = 0;
  let awayScore = 0;

  for (const event of events) {
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
