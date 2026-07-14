export interface StandingsTeamInput {
  teamId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface StandingsFixtureInput {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface StandingRow {
  position: number;
  teamId: string;
  teamName: string;
  teamSlug: string;
  teamLogoUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

interface StandingsAccumulator {
  teamId: string;
  teamName: string;
  teamSlug: string;
  teamLogoUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
}

const POINTS_FOR_WIN = 3;
const POINTS_FOR_DRAW = 1;

export function computeStandings(
  teams: StandingsTeamInput[],
  fixtures: StandingsFixtureInput[],
): StandingRow[] {
  const table = new Map<string, StandingsAccumulator>();

  for (const team of teams) {
    table.set(team.teamId, {
      teamId: team.teamId,
      teamName: team.name,
      teamSlug: team.slug,
      teamLogoUrl: team.logoUrl,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    });
  }

  for (const fixture of fixtures) {
    if (fixture.homeScore === null || fixture.awayScore === null) {
      continue;
    }

    const home = table.get(fixture.homeTeamId);
    const away = table.get(fixture.awayTeamId);

    if (!home || !away) {
      continue;
    }

    home.played += 1;
    away.played += 1;
    home.goalsFor += fixture.homeScore;
    home.goalsAgainst += fixture.awayScore;
    away.goalsFor += fixture.awayScore;
    away.goalsAgainst += fixture.homeScore;

    if (fixture.homeScore > fixture.awayScore) {
      home.won += 1;
      away.lost += 1;
    } else if (fixture.homeScore < fixture.awayScore) {
      away.won += 1;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
    }
  }

  const rows = Array.from(table.values()).map((row) => ({
    ...row,
    goalDifference: row.goalsFor - row.goalsAgainst,
    points: row.won * POINTS_FOR_WIN + row.drawn * POINTS_FOR_DRAW,
  }));

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference)
      return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName);
  });

  return rows.map((row, index) => ({
    position: index + 1,
    teamId: row.teamId,
    teamName: row.teamName,
    teamSlug: row.teamSlug,
    teamLogoUrl: row.teamLogoUrl,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalDifference: row.goalDifference,
    points: row.points,
  }));
}
