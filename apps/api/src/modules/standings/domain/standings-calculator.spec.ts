import { computeStandings } from "./standings-calculator";

const teamA = { teamId: "a", name: "Alpha FC", slug: "alpha-fc", logoUrl: null };
const teamB = { teamId: "b", name: "Bravo FC", slug: "bravo-fc", logoUrl: null };
const teamC = { teamId: "c", name: "Charlie FC", slug: "charlie-fc", logoUrl: null };

describe("computeStandings", () => {
  it("includes every entered team even with zero fixtures played", () => {
    const table = computeStandings([teamA, teamB], []);

    expect(table).toHaveLength(2);
    expect(table.every((row) => row.played === 0 && row.points === 0)).toBe(true);
  });

  it("awards 3 points for a win and 0 for a loss", () => {
    const table = computeStandings(
      [teamA, teamB],
      [{ homeTeamId: "a", awayTeamId: "b", homeScore: 2, awayScore: 0 }],
    );

    const alpha = table.find((row) => row.teamId === "a")!;
    const bravo = table.find((row) => row.teamId === "b")!;

    expect(alpha.won).toBe(1);
    expect(alpha.points).toBe(3);
    expect(alpha.goalDifference).toBe(2);
    expect(bravo.lost).toBe(1);
    expect(bravo.points).toBe(0);
    expect(bravo.goalDifference).toBe(-2);
  });

  it("awards 1 point each for a draw", () => {
    const table = computeStandings(
      [teamA, teamB],
      [{ homeTeamId: "a", awayTeamId: "b", homeScore: 1, awayScore: 1 }],
    );

    expect(table.find((row) => row.teamId === "a")!.points).toBe(1);
    expect(table.find((row) => row.teamId === "b")!.points).toBe(1);
    expect(table.find((row) => row.teamId === "a")!.drawn).toBe(1);
  });

  it("ignores fixtures that have not been played yet", () => {
    const table = computeStandings(
      [teamA, teamB],
      [{ homeTeamId: "a", awayTeamId: "b", homeScore: null, awayScore: null }],
    );

    expect(table.every((row) => row.played === 0)).toBe(true);
  });

  it("sorts by points, then goal difference, then goals scored, then name", () => {
    const table = computeStandings(
      [teamA, teamB, teamC],
      [
        // Alpha and Bravo both finish on 3 points, but Alpha has a better goal difference.
        { homeTeamId: "a", awayTeamId: "c", homeScore: 3, awayScore: 0 },
        { homeTeamId: "b", awayTeamId: "c", homeScore: 1, awayScore: 0 },
      ],
    );

    expect(table.map((row) => row.teamId)).toEqual(["a", "b", "c"]);
    expect(table[0].position).toBe(1);
    expect(table[1].position).toBe(2);
    expect(table[2].position).toBe(3);
  });

  it("breaks a full tie (points, goal difference, goals for) alphabetically by name", () => {
    const table = computeStandings(
      [teamB, teamA],
      [
        { homeTeamId: "a", awayTeamId: "c", homeScore: 1, awayScore: 1 },
        { homeTeamId: "b", awayTeamId: "c", homeScore: 1, awayScore: 1 },
      ],
    );

    // Both Alpha and Bravo drew 1-1 against a third team: identical points/GD/GF.
    expect(table.map((row) => row.teamName)).toEqual(["Alpha FC", "Bravo FC"]);
  });

  it("accumulates stats correctly across multiple fixtures for the same team", () => {
    const table = computeStandings(
      [teamA, teamB, teamC],
      [
        { homeTeamId: "a", awayTeamId: "b", homeScore: 2, awayScore: 1 },
        { homeTeamId: "c", awayTeamId: "a", homeScore: 0, awayScore: 0 },
      ],
    );

    const alpha = table.find((row) => row.teamId === "a")!;
    expect(alpha.played).toBe(2);
    expect(alpha.won).toBe(1);
    expect(alpha.drawn).toBe(1);
    expect(alpha.goalsFor).toBe(2);
    expect(alpha.goalsAgainst).toBe(1);
    expect(alpha.points).toBe(4);
  });
});
