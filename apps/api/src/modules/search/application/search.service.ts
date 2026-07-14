import { Injectable } from '@nestjs/common';
import { SEARCH_INDEXES } from '../domain/search-index';
import { SearchIndexService } from '../infrastructure/search-index.service';

export interface TeamSearchDoc {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  logoUrl: string | null;
}

export interface PlayerSearchDoc {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  position: string | null;
  teamName: string | null;
}

export interface CompetitionSearchDoc {
  id: string;
  name: string;
  slug: string;
  season: string;
  country: string | null;
}

export interface NewsSearchDoc {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
}

const DEFAULT_SEARCH_LIMIT = 5;

@Injectable()
export class SearchService {
  constructor(private readonly index: SearchIndexService) {}

  indexTeam(team: TeamSearchDoc) {
    return this.index.upsertDocument(SEARCH_INDEXES.TEAMS, team);
  }

  deleteTeam(id: string) {
    return this.index.deleteDocument(SEARCH_INDEXES.TEAMS, id);
  }

  indexPlayer(player: PlayerSearchDoc) {
    return this.index.upsertDocument(SEARCH_INDEXES.PLAYERS, player);
  }

  deletePlayer(id: string) {
    return this.index.deleteDocument(SEARCH_INDEXES.PLAYERS, id);
  }

  indexCompetition(competition: CompetitionSearchDoc) {
    return this.index.upsertDocument(SEARCH_INDEXES.COMPETITIONS, competition);
  }

  deleteCompetition(id: string) {
    return this.index.deleteDocument(SEARCH_INDEXES.COMPETITIONS, id);
  }

  indexNewsArticle(article: NewsSearchDoc) {
    return this.index.upsertDocument(SEARCH_INDEXES.NEWS, article);
  }

  deleteNewsArticle(id: string) {
    return this.index.deleteDocument(SEARCH_INDEXES.NEWS, id);
  }

  async searchAll(query: string, limit: number = DEFAULT_SEARCH_LIMIT) {
    const [teams, players, competitions, news] = await Promise.all([
      this.index.search(SEARCH_INDEXES.TEAMS, query, limit),
      this.index.search(SEARCH_INDEXES.PLAYERS, query, limit),
      this.index.search(SEARCH_INDEXES.COMPETITIONS, query, limit),
      this.index.search(SEARCH_INDEXES.NEWS, query, limit),
    ]);

    return { teams, players, competitions, news };
  }
}
