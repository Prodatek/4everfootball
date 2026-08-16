// Every field a template needs, snapshotted into Graphic.data at enqueue
// time by GraphicsService — templates never touch the database. The
// `*DataUri` fields below are filled in by ImageEmbedService.prepare() at
// RENDER time, not enqueue time — enqueueing must stay a single fast
// INSERT so hooks like MatchEventsService.recordEvent() never block a
// request on a network image fetch (brief §4: "Never block a request on
// image rendering"). Callers only ever populate the sibling `*Url` field
// (e.g. `homeLogoUrl`, taken straight from Team.logoUrl); prepare() reads
// any key ending in "Url" and adds the matching "...DataUri" key before a
// template ever sees the data — see GraphicsWorkerService.

export interface FullTimeResultData {
  competitionName: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  homeLogoDataUri: string | null;
  awayLogoDataUri: string | null;
  venueName: string | null;
  kickoffDate: string;
}

export interface GoalAlertData {
  competitionName: string;
  scorerName: string;
  scoringTeamName: string;
  minute: number;
  stoppageMinute: number | null;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
}

export interface MatchdayFixture {
  homeTeamName: string;
  awayTeamName: string;
  kickoffTime: string;
}

export interface MatchdayFixturesData {
  competitionName: string;
  dateLabel: string;
  fixtures: MatchdayFixture[];
}

export interface LeagueTableRow {
  position: number;
  teamName: string;
  played: number;
  points: number;
  goalDifference: number;
}

export interface LeagueTableData {
  competitionName: string;
  roundLabel: string;
  rows: LeagueTableRow[];
}

export interface TopScorerRow {
  playerName: string;
  teamName: string;
  goals: number;
}

export interface TopScorersData {
  competitionName: string;
  scorers: TopScorerRow[];
}

export interface PlayerOfWeekData {
  competitionName: string;
  weekLabel: string;
  playerName: string;
  teamName: string;
  photoDataUri: string | null;
  goals: number;
  assists: number;
}

export interface PlayerPassportData {
  playerName: string;
  teamName: string | null;
  position: string | null;
  shirtNumber: number | null;
  nationality: string | null;
  ageLabel: string | null;
  photoDataUri: string | null;
  competitionName: string | null;
}

export interface HeadToHeadData {
  competitionName: string;
  homeTeamName: string;
  awayTeamName: string;
  homeLogoDataUri: string | null;
  awayLogoDataUri: string | null;
  kickoffDateLabel: string;
  recentForm: string[]; // e.g. ["W", "D", "L"] most recent first
}

export interface MilestoneData {
  headline: string;
  subheadline: string;
  contextLabel: string;
}

export interface SeasonSummaryData {
  competitionName: string;
  season: string;
  championTeamName: string | null;
  topScorerName: string | null;
  topScorerGoals: number | null;
  totalMatches: number;
  totalGoals: number;
}

export type TemplateDataMap = {
  FULL_TIME_RESULT: FullTimeResultData;
  GOAL_ALERT: GoalAlertData;
  MATCHDAY_FIXTURES: MatchdayFixturesData;
  LEAGUE_TABLE: LeagueTableData;
  TOP_SCORERS: TopScorersData;
  PLAYER_OF_WEEK: PlayerOfWeekData;
  PLAYER_PASSPORT: PlayerPassportData;
  HEAD_TO_HEAD: HeadToHeadData;
  MILESTONE: MilestoneData;
  SEASON_SUMMARY: SeasonSummaryData;
};
