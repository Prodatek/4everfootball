import { Injectable } from '@nestjs/common';
import { TeamsService } from '../../teams/application/teams.service';
import { PlayersService } from '../../players/application/players.service';
import { CompetitionsService } from '../../competitions/application/competitions.service';
import { NewsService } from '../../news/application/news.service';
import { SearchService } from './search.service';

interface IndexableTeam {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  logoUrl: string | null;
  isActive: boolean;
}

interface IndexablePlayer {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  position: string | null;
  team: { name: string } | null;
  isActive: boolean;
}

interface IndexableCompetition {
  id: string;
  name: string;
  slug: string;
  season: string;
  country: string | null;
  isActive: boolean;
}

interface IndexableNewsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
}

const REINDEX_PAGE_SIZE = 1000;

/**
 * Populates/rebuilds the Meilisearch indexes from Postgres. Lives outside
 * SearchModule (which stays a leaf so Teams/Players/Competitions/News can
 * depend on it for their write-time sync hooks without a cycle); this
 * service instead depends on those four modules plus SearchService.
 */
@Injectable()
export class SearchReindexService {
  constructor(
    private readonly searchService: SearchService,
    private readonly teamsService: TeamsService,
    private readonly playersService: PlayersService,
    private readonly competitionsService: CompetitionsService,
    private readonly newsService: NewsService,
  ) {}

  async reindexAll() {
    const [teamsResult, playersResult, competitionsResult, newsResult] =
      await Promise.all([
        this.teamsService.listForAdmin({
          page: 1,
          limit: REINDEX_PAGE_SIZE,
          sortBy: 'name',
          sortOrder: 'asc',
        } as never),
        this.playersService.listForAdmin({
          page: 1,
          limit: REINDEX_PAGE_SIZE,
          sortBy: 'lastName',
          sortOrder: 'asc',
        } as never),
        this.competitionsService.listForAdmin({
          page: 1,
          limit: REINDEX_PAGE_SIZE,
          sortBy: 'name',
          sortOrder: 'asc',
        } as never),
        this.newsService.listForAdmin({
          page: 1,
          limit: REINDEX_PAGE_SIZE,
          status: 'PUBLISHED',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        } as never),
      ]);

    const teams = teamsResult.data as IndexableTeam[];
    const players = playersResult.data as IndexablePlayer[];
    const competitions = competitionsResult.data as IndexableCompetition[];
    const news = newsResult.data as IndexableNewsArticle[];

    await Promise.all([
      ...teams
        .filter((team) => team.isActive)
        .map((team) =>
          this.searchService.indexTeam({
            id: team.id,
            name: team.name,
            slug: team.slug,
            country: team.country,
            logoUrl: team.logoUrl,
          }),
        ),
      ...players
        .filter((player) => player.isActive)
        .map((player) =>
          this.searchService.indexPlayer({
            id: player.id,
            firstName: player.firstName,
            lastName: player.lastName,
            slug: player.slug,
            position: player.position,
            teamName: player.team?.name ?? null,
          }),
        ),
      ...competitions
        .filter((competition) => competition.isActive)
        .map((competition) =>
          this.searchService.indexCompetition({
            id: competition.id,
            name: competition.name,
            slug: competition.slug,
            season: competition.season,
            country: competition.country,
          }),
        ),
      ...news.map((article) =>
        this.searchService.indexNewsArticle({
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
        }),
      ),
    ]);

    return {
      teams: teams.length,
      players: players.length,
      competitions: competitions.length,
      news: news.length,
    };
  }
}
