import { computeForm } from './form-calculator';

const A = 'team-a';
const B = 'team-b';

function fixture(
  overrides: Partial<Parameters<typeof computeForm>[1][number]>,
) {
  return {
    homeTeamId: A,
    awayTeamId: B,
    homeScore: 1,
    awayScore: 0,
    kickoffAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('computeForm', () => {
  it('returns an empty result list for a team with no played fixtures', () => {
    const [form] = computeForm([{ teamId: A }], []);
    expect(form).toEqual({ teamId: A, results: [] });
  });

  it('records a win for the higher-scoring team, home or away', () => {
    const forms = computeForm(
      [{ teamId: A }, { teamId: B }],
      [fixture({ homeScore: 2, awayScore: 0 })],
    );
    expect(forms.find((f) => f.teamId === A)!.results).toEqual(['W']);
    expect(forms.find((f) => f.teamId === B)!.results).toEqual(['L']);
  });

  it('records a draw for equal scores', () => {
    const forms = computeForm(
      [{ teamId: A }],
      [fixture({ homeScore: 1, awayScore: 1 })],
    );
    expect(forms[0].results).toEqual(['D']);
  });

  it('ignores fixtures that have not been played yet', () => {
    const forms = computeForm(
      [{ teamId: A }],
      [fixture({ homeScore: null, awayScore: null })],
    );
    expect(forms[0].results).toEqual([]);
  });

  it('orders results oldest to newest and keeps only the most recent N', () => {
    const forms = computeForm(
      [{ teamId: A }],
      [
        fixture({
          kickoffAt: '2026-01-03T00:00:00.000Z',
          homeScore: 1,
          awayScore: 0,
        }), // W, 3rd
        fixture({
          kickoffAt: '2026-01-01T00:00:00.000Z',
          homeScore: 0,
          awayScore: 1,
        }), // L, 1st
        fixture({
          kickoffAt: '2026-01-02T00:00:00.000Z',
          homeScore: 1,
          awayScore: 1,
        }), // D, 2nd
      ],
      2,
    );
    expect(forms[0].results).toEqual(['D', 'W']);
  });

  it('only counts fixtures the team actually played in', () => {
    const forms = computeForm(
      [{ teamId: A }],
      [fixture({ homeTeamId: 'team-x', awayTeamId: 'team-y' })],
    );
    expect(forms[0].results).toEqual([]);
  });
});
