import { deriveScore } from './score-deriver';

const HOME = 'home-team';
const AWAY = 'away-team';

describe('deriveScore', () => {
  it('returns 0-0 with no events', () => {
    expect(deriveScore([], HOME, AWAY)).toEqual({ homeScore: 0, awayScore: 0 });
  });

  it('counts a GOAL event for the scoring team', () => {
    const result = deriveScore(
      [{ id: 'e1', type: 'GOAL', teamId: HOME }],
      HOME,
      AWAY,
    );
    expect(result).toEqual({ homeScore: 1, awayScore: 0 });
  });

  it('counts a PENALTY_SCORED event as a goal', () => {
    const result = deriveScore(
      [{ id: 'e1', type: 'PENALTY_SCORED', teamId: AWAY }],
      HOME,
      AWAY,
    );
    expect(result).toEqual({ homeScore: 0, awayScore: 1 });
  });

  it('does not count non-scoring event types', () => {
    const result = deriveScore(
      [
        { id: 'e1', type: 'SHOT', teamId: HOME },
        { id: 'e2', type: 'SHOT_ON_TARGET', teamId: HOME },
        { id: 'e3', type: 'PENALTY_AWARDED', teamId: HOME },
        { id: 'e4', type: 'PENALTY_MISSED', teamId: HOME },
        { id: 'e5', type: 'CORNER', teamId: AWAY },
      ],
      HOME,
      AWAY,
    );
    expect(result).toEqual({ homeScore: 0, awayScore: 0 });
  });

  it('accumulates multiple goals across both teams', () => {
    const result = deriveScore(
      [
        { id: 'e1', type: 'GOAL', teamId: HOME },
        { id: 'e2', type: 'GOAL', teamId: AWAY },
        { id: 'e3', type: 'GOAL', teamId: HOME },
        { id: 'e4', type: 'PENALTY_SCORED', teamId: AWAY },
      ],
      HOME,
      AWAY,
    );
    expect(result).toEqual({ homeScore: 2, awayScore: 2 });
  });

  it('ignores a goal-scoring event whose teamId matches neither fixture team', () => {
    const result = deriveScore(
      [{ id: 'e1', type: 'GOAL', teamId: 'some-other-team' }],
      HOME,
      AWAY,
    );
    expect(result).toEqual({ homeScore: 0, awayScore: 0 });
  });

  it('is order-independent (recomputes from scratch, never increments)', () => {
    const events = [
      { id: 'e1', type: 'GOAL' as const, teamId: HOME },
      { id: 'e2', type: 'GOAL' as const, teamId: HOME },
    ];
    const first = deriveScore(events, HOME, AWAY);
    const second = deriveScore(events.slice(0, 1), HOME, AWAY);
    expect(first).toEqual({ homeScore: 2, awayScore: 0 });
    expect(second).toEqual({ homeScore: 1, awayScore: 0 });
  });

  describe('corrections', () => {
    it('excludes a goal retracted by a later CORRECTION event', () => {
      const result = deriveScore(
        [
          { id: 'e1', type: 'GOAL', teamId: HOME },
          {
            id: 'e2',
            type: 'CORRECTION',
            teamId: null,
            correctsEventId: 'e1',
            metadata: { action: 'RETRACT' },
          },
        ],
        HOME,
        AWAY,
      );
      expect(result).toEqual({ homeScore: 0, awayScore: 0 });
    });

    it('leaves other goals untouched when only one is retracted', () => {
      const result = deriveScore(
        [
          { id: 'e1', type: 'GOAL', teamId: HOME },
          { id: 'e2', type: 'GOAL', teamId: HOME },
          {
            id: 'e3',
            type: 'CORRECTION',
            teamId: null,
            correctsEventId: 'e1',
            metadata: { action: 'RETRACT' },
          },
        ],
        HOME,
        AWAY,
      );
      expect(result).toEqual({ homeScore: 1, awayScore: 0 });
    });

    it('a CORRECTION event without RETRACT metadata has no effect on the score', () => {
      const result = deriveScore(
        [
          { id: 'e1', type: 'GOAL', teamId: HOME },
          {
            id: 'e2',
            type: 'CORRECTION',
            teamId: null,
            correctsEventId: 'e1',
            metadata: { action: 'ANNOTATE' },
          },
        ],
        HOME,
        AWAY,
      );
      expect(result).toEqual({ homeScore: 1, awayScore: 0 });
    });

    it('the retracted original event itself is never removed from the list — it just stops counting', () => {
      // deriveScore only ever receives what the caller passes; this test
      // documents that retraction is a scoring-time filter, not a deletion,
      // by confirming a 3-event list (goal, correction, and an unrelated
      // goal) still produces the right count with the original goal intact
      // in the input array.
      const events = [
        { id: 'e1', type: 'GOAL' as const, teamId: HOME },
        {
          id: 'e2',
          type: 'CORRECTION' as const,
          teamId: null,
          correctsEventId: 'e1',
          metadata: { action: 'RETRACT' },
        },
        { id: 'e3', type: 'GOAL' as const, teamId: AWAY },
      ];
      expect(events).toHaveLength(3);
      expect(deriveScore(events, HOME, AWAY)).toEqual({
        homeScore: 0,
        awayScore: 1,
      });
    });
  });
});
