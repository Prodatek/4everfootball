import {
  aggregatePlayerStats,
  aggregateTopAssists,
  aggregateTopScorers,
  type StatsEventInput,
} from './stats-aggregator';

const striker = {
  id: 'p1',
  firstName: 'Alex',
  lastName: 'Striker',
  slug: 'alex-striker',
};
const playmaker = {
  id: 'p2',
  firstName: 'Sam',
  lastName: 'Playmaker',
  slug: 'sam-playmaker',
};
const defender = {
  id: 'p3',
  firstName: 'Zoe',
  lastName: 'Defender',
  slug: 'zoe-defender',
};

function goal(overrides: Partial<StatsEventInput> = {}): StatsEventInput {
  return {
    fixtureId: 'fixture-1',
    type: 'GOAL',
    playerId: striker.id,
    player: striker,
    assistPlayerId: null,
    assistPlayer: null,
    ...overrides,
  };
}

describe('aggregateTopScorers', () => {
  it('counts GOAL and PENALTY_SCORED events for the scoring player', () => {
    const rows = aggregateTopScorers([
      goal(),
      goal({ type: 'PENALTY_SCORED' }),
      goal({
        fixtureId: 'fixture-2',
        playerId: playmaker.id,
        player: playmaker,
      }),
    ]);

    expect(rows).toEqual([
      {
        playerId: striker.id,
        playerName: 'Alex Striker',
        playerSlug: 'alex-striker',
        count: 2,
      },
      {
        playerId: playmaker.id,
        playerName: 'Sam Playmaker',
        playerSlug: 'sam-playmaker',
        count: 1,
      },
    ]);
  });

  it('ignores non-scoring event types', () => {
    const rows = aggregateTopScorers([
      goal({ type: 'SHOT' }),
      goal({ type: 'YELLOW_CARD' }),
    ]);
    expect(rows).toEqual([]);
  });

  it('ignores events with no player attached', () => {
    const rows = aggregateTopScorers([goal({ playerId: null, player: null })]);
    expect(rows).toEqual([]);
  });

  it('breaks ties alphabetically by name', () => {
    const rows = aggregateTopScorers([
      goal(),
      goal({
        fixtureId: 'fixture-2',
        playerId: playmaker.id,
        player: playmaker,
      }),
    ]);
    expect(rows.map((row) => row.playerName)).toEqual([
      'Alex Striker',
      'Sam Playmaker',
    ]);
  });
});

describe('aggregateTopAssists', () => {
  it('counts only GOAL events with an assist player', () => {
    const rows = aggregateTopAssists([
      goal({ assistPlayerId: playmaker.id, assistPlayer: playmaker }),
      goal({
        fixtureId: 'fixture-2',
        assistPlayerId: playmaker.id,
        assistPlayer: playmaker,
      }),
      goal({
        type: 'PENALTY_SCORED',
        assistPlayerId: playmaker.id,
        assistPlayer: playmaker,
      }),
    ]);

    expect(rows).toEqual([
      {
        playerId: playmaker.id,
        playerName: 'Sam Playmaker',
        playerSlug: 'sam-playmaker',
        count: 2,
      },
    ]);
  });

  it('ignores goals with no assist recorded', () => {
    expect(aggregateTopAssists([goal()])).toEqual([]);
  });
});

describe('aggregatePlayerStats', () => {
  it('counts goals scored by the player', () => {
    const stats = aggregatePlayerStats(
      [goal(), goal({ fixtureId: 'fixture-2', type: 'PENALTY_SCORED' })],
      striker.id,
    );
    expect(stats.goals).toBe(2);
    expect(stats.appearances).toBe(2);
  });

  it('counts assists credited to the player, only for GOAL events', () => {
    const stats = aggregatePlayerStats(
      [
        goal({ assistPlayerId: playmaker.id, assistPlayer: playmaker }),
        goal({
          fixtureId: 'fixture-2',
          type: 'PENALTY_SCORED',
          assistPlayerId: playmaker.id,
          assistPlayer: playmaker,
        }),
      ],
      playmaker.id,
    );
    expect(stats.assists).toBe(1);
  });

  it('counts yellow and red cards for the player', () => {
    const stats = aggregatePlayerStats(
      [
        goal({ type: 'YELLOW_CARD', playerId: defender.id, player: defender }),
        goal({
          fixtureId: 'fixture-2',
          type: 'RED_CARD',
          playerId: defender.id,
          player: defender,
        }),
      ],
      defender.id,
    );
    expect(stats.yellowCards).toBe(1);
    expect(stats.redCards).toBe(1);
  });

  it('counts appearances as distinct fixtures the player was involved in, as scorer or assister', () => {
    const stats = aggregatePlayerStats(
      [
        goal({ fixtureId: 'fixture-1' }),
        goal({
          fixtureId: 'fixture-1',
          type: 'YELLOW_CARD',
          playerId: striker.id,
          player: striker,
        }),
        goal({
          fixtureId: 'fixture-2',
          playerId: playmaker.id,
          player: playmaker,
          assistPlayerId: striker.id,
          assistPlayer: striker,
        }),
      ],
      striker.id,
    );
    // Two distinct fixtures, even though fixture-1 has two events for the player.
    expect(stats.appearances).toBe(2);
  });

  it('returns all zeros for a player with no events', () => {
    expect(aggregatePlayerStats([goal()], 'unrelated-player')).toEqual({
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      appearances: 0,
    });
  });
});
