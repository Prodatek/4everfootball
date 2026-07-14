import { Injectable } from '@nestjs/common';
import { TeamsService } from '../../teams/application/teams.service';
import { PlayersService } from '../../players/application/players.service';
import { CompetitionsService } from '../../competitions/application/competitions.service';
import { FixturesService } from '../../fixtures/application/fixtures.service';
import { NewsService } from '../../news/application/news.service';
import { UsersService } from '../../users/application/users.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly playersService: PlayersService,
    private readonly competitionsService: CompetitionsService,
    private readonly fixturesService: FixturesService,
    private readonly newsService: NewsService,
    private readonly usersService: UsersService,
  ) {}

  async getSummary() {
    const [
      teams,
      players,
      competitions,
      fixtures,
      news,
      publishedNews,
      draftNews,
      users,
      liveFixtures,
      upcomingFixtures,
    ] = await Promise.all([
      this.teamsService.listForAdmin({
        page: 1,
        limit: 1,
        sortBy: 'name',
        sortOrder: 'asc',
      } as never),
      this.playersService.listForAdmin({
        page: 1,
        limit: 1,
        sortBy: 'lastName',
        sortOrder: 'asc',
      } as never),
      this.competitionsService.listForAdmin({
        page: 1,
        limit: 1,
        sortBy: 'name',
        sortOrder: 'asc',
      } as never),
      this.fixturesService.list({
        page: 1,
        limit: 1,
        sortBy: 'kickoffAt',
        sortOrder: 'asc',
      } as never),
      this.newsService.listForAdmin({
        page: 1,
        limit: 1,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      } as never),
      this.newsService.listForAdmin({
        page: 1,
        limit: 1,
        status: 'PUBLISHED',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      } as never),
      this.newsService.listForAdmin({
        page: 1,
        limit: 1,
        status: 'DRAFT',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      } as never),
      this.usersService.listForAdmin({
        page: 1,
        limit: 1,
        sortBy: 'displayName',
        sortOrder: 'asc',
      } as never),
      this.fixturesService.list({
        page: 1,
        limit: 10,
        status: 'LIVE',
        sortBy: 'kickoffAt',
        sortOrder: 'asc',
      } as never),
      this.fixturesService.list({
        page: 1,
        limit: 5,
        status: 'SCHEDULED',
        sortBy: 'kickoffAt',
        sortOrder: 'asc',
      } as never),
    ]);

    return {
      totals: {
        teams: teams.meta.total,
        players: players.meta.total,
        competitions: competitions.meta.total,
        fixtures: fixtures.meta.total,
        newsArticles: news.meta.total,
        publishedNewsArticles: publishedNews.meta.total,
        draftNewsArticles: draftNews.meta.total,
        users: users.meta.total,
      },
      liveFixtures: liveFixtures.data,
      upcomingFixtures: upcomingFixtures.data,
    };
  }
}
