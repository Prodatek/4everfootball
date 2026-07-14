import type { Fixture } from "./fixture";

export interface DashboardSummary {
  totals: {
    teams: number;
    players: number;
    competitions: number;
    fixtures: number;
    newsArticles: number;
    publishedNewsArticles: number;
    draftNewsArticles: number;
    users: number;
  };
  liveFixtures: Fixture[];
  upcomingFixtures: Fixture[];
}
