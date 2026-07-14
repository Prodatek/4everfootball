export const SEARCH_INDEXES = {
  TEAMS: 'teams',
  PLAYERS: 'players',
  COMPETITIONS: 'competitions',
  NEWS: 'news',
} as const;

export type SearchIndexName =
  (typeof SEARCH_INDEXES)[keyof typeof SEARCH_INDEXES];

export const ALL_SEARCH_INDEXES: SearchIndexName[] =
  Object.values(SEARCH_INDEXES);
