export type FormResult = 'W' | 'D' | 'L';

export interface FormFixtureInput {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  kickoffAt: Date | string;
}

export interface TeamForm {
  teamId: string;
  results: FormResult[];
}

const DEFAULT_FORM_LENGTH = 5;

export function computeForm(
  teams: { teamId: string }[],
  fixtures: FormFixtureInput[],
  limit: number = DEFAULT_FORM_LENGTH,
): TeamForm[] {
  return teams.map(({ teamId }) => {
    const playedFixtures = fixtures
      .filter(
        (fixture) =>
          (fixture.homeTeamId === teamId || fixture.awayTeamId === teamId) &&
          fixture.homeScore !== null &&
          fixture.awayScore !== null,
      )
      .sort(
        (a, b) =>
          new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime(),
      )
      .slice(-limit);

    const results = playedFixtures.map((fixture): FormResult => {
      const isHome = fixture.homeTeamId === teamId;
      const teamScore = (
        isHome ? fixture.homeScore : fixture.awayScore
      ) as number;
      const opponentScore = (
        isHome ? fixture.awayScore : fixture.homeScore
      ) as number;

      if (teamScore > opponentScore) return 'W';
      if (teamScore < opponentScore) return 'L';
      return 'D';
    });

    return { teamId, results };
  });
}
