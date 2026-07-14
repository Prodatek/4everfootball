import type { MatchEventType } from '@prisma/client';

export interface PlayerSummaryInput {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
}

export interface StatsEventInput {
  fixtureId: string;
  type: MatchEventType;
  playerId: string | null;
  player: PlayerSummaryInput | null;
  assistPlayerId: string | null;
  assistPlayer: PlayerSummaryInput | null;
}

export interface LeaderboardRow {
  playerId: string;
  playerName: string;
  playerSlug: string;
  count: number;
}

const GOAL_SCORING_TYPES: MatchEventType[] = ['GOAL', 'PENALTY_SCORED'];

function toLeaderboard(counts: Map<string, LeaderboardRow>): LeaderboardRow[] {
  return Array.from(counts.values()).sort(
    (a, b) => b.count - a.count || a.playerName.localeCompare(b.playerName),
  );
}

export function aggregateTopScorers(
  events: StatsEventInput[],
): LeaderboardRow[] {
  const counts = new Map<string, LeaderboardRow>();

  for (const event of events) {
    if (
      !GOAL_SCORING_TYPES.includes(event.type) ||
      !event.playerId ||
      !event.player
    ) {
      continue;
    }

    const existing = counts.get(event.playerId);

    if (existing) {
      existing.count += 1;
    } else {
      counts.set(event.playerId, {
        playerId: event.playerId,
        playerName: `${event.player.firstName} ${event.player.lastName}`,
        playerSlug: event.player.slug,
        count: 1,
      });
    }
  }

  return toLeaderboard(counts);
}

export function aggregateTopAssists(
  events: StatsEventInput[],
): LeaderboardRow[] {
  const counts = new Map<string, LeaderboardRow>();

  for (const event of events) {
    if (event.type !== 'GOAL' || !event.assistPlayerId || !event.assistPlayer) {
      continue;
    }

    const existing = counts.get(event.assistPlayerId);

    if (existing) {
      existing.count += 1;
    } else {
      counts.set(event.assistPlayerId, {
        playerId: event.assistPlayerId,
        playerName: `${event.assistPlayer.firstName} ${event.assistPlayer.lastName}`,
        playerSlug: event.assistPlayer.slug,
        count: 1,
      });
    }
  }

  return toLeaderboard(counts);
}

export interface PlayerStatsSummary {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  appearances: number;
}

/**
 * "Appearances" is approximated as the number of distinct fixtures the player
 * has at least one recorded event in (as scorer, assister, carded, etc.) —
 * there is no separate lineup/substitution-tracked "played in this match"
 * signal, so a player who featured but generated zero events would not be
 * counted. A real lineup/appearances feature is out of scope for this pass.
 */
export function aggregatePlayerStats(
  events: StatsEventInput[],
  playerId: string,
): PlayerStatsSummary {
  let goals = 0;
  let assists = 0;
  let yellowCards = 0;
  let redCards = 0;
  const fixtureIds = new Set<string>();

  for (const event of events) {
    const isSubject = event.playerId === playerId;
    const isAssister = event.assistPlayerId === playerId;

    if (!isSubject && !isAssister) {
      continue;
    }

    fixtureIds.add(event.fixtureId);

    if (isSubject) {
      if (GOAL_SCORING_TYPES.includes(event.type)) goals += 1;
      if (event.type === 'YELLOW_CARD') yellowCards += 1;
      if (event.type === 'RED_CARD') redCards += 1;
    }

    if (isAssister && event.type === 'GOAL') {
      assists += 1;
    }
  }

  return {
    goals,
    assists,
    yellowCards,
    redCards,
    appearances: fixtureIds.size,
  };
}
