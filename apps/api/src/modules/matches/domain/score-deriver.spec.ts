import { deriveScore } from './score-deriver';

const HOME = 'home-team';
const AWAY = 'away-team';

describe('deriveScore', () => {
  it('returns 0-0 with no events', () => {
    expect(deriveScore([], HOME, AWAY)).toEqual({ homeScore: 0, awayScore: 0 });
  });

  it('counts a GOAL event for the scoring team', () => {
    const result = deriveScore([{ type: 'GOAL', teamId: HOME }], HOME, AWAY);
    expect(result).toEqual({ homeScore: 1, awayScore: 0 });
  });

  it('counts a PENALTY_SCORED event as a goal', () => {
    const result = deriveScore(
      [{ type: 'PENALTY_SCORED', teamId: AWAY }],
      HOME,
      AWAY,
    );
    expect(result).toEqual({ homeScore: 0, awayScore: 1 });
  });

  it('does not count non-scoring event types', () => {
    const result = deriveScore(
      [
        { type: 'SHOT', teamId: HOME },
        { type: 'SHOT_ON_TARGET', teamId: HOME },
        { type: 'PENALTY_AWARDED', teamId: HOME },
        { type: 'PENALTY_MISSED', teamId: HOME },
        { type: 'CORNER', teamId: AWAY },
      ],
      HOME,
      AWAY,
    );
    expect(result).toEqual({ homeScore: 0, awayScore: 0 });
  });

  it('accumulates multiple goals across both teams', () => {
    const result = deriveScore(
      [
        { type: 'GOAL', teamId: HOME },
        { type: 'GOAL', teamId: AWAY },
        { type: 'GOAL', teamId: HOME },
        { type: 'PENALTY_SCORED', teamId: AWAY },
      ],
      HOME,
      AWAY,
    );
    expect(result).toEqual({ homeScore: 2, awayScore: 2 });
  });

  it('ignores a goal-scoring event whose teamId matches neither fixture team', () => {
    const result = deriveScore(
      [{ type: 'GOAL', teamId: 'some-other-team' }],
      HOME,
      AWAY,
    );
    expect(result).toEqual({ homeScore: 0, awayScore: 0 });
  });

  it('is order-independent (recomputes from scratch, never increments)', () => {
    const events = [
      { type: 'GOAL' as const, teamId: HOME },
      { type: 'GOAL' as const, teamId: HOME },
    ];
    const first = deriveScore(events, HOME, AWAY);
    const second = deriveScore(events.slice(0, 1), HOME, AWAY);
    expect(first).toEqual({ homeScore: 2, awayScore: 0 });
    expect(second).toEqual({ homeScore: 1, awayScore: 0 });
  });
});
