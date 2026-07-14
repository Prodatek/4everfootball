export interface TeamSearchHit {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  logoUrl: string | null;
}

export interface PlayerSearchHit {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  position: string | null;
  teamName: string | null;
}

export interface CompetitionSearchHit {
  id: string;
  name: string;
  slug: string;
  season: string;
  country: string | null;
}

export interface NewsSearchHit {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
}

export interface SearchResults {
  teams: TeamSearchHit[];
  players: PlayerSearchHit[];
  competitions: CompetitionSearchHit[];
  news: NewsSearchHit[];
}

export interface ReindexSummary {
  teams: number;
  players: number;
  competitions: number;
  news: number;
}
