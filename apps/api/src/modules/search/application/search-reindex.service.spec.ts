import { Test } from '@nestjs/testing';
import { SearchReindexService } from './search-reindex.service';
import { SearchService } from './search.service';
import { TeamsService } from '../../teams/application/teams.service';
import { PlayersService } from '../../players/application/players.service';
import { CompetitionsService } from '../../competitions/application/competitions.service';
import { NewsService } from '../../news/application/news.service';

function paginated(data: unknown[]) {
  return {
    data,
    meta: { page: 1, limit: 1000, total: data.length, totalPages: 1 },
  };
}

describe('SearchReindexService', () => {
  let service: SearchReindexService;
  let searchService: jest.Mocked<SearchService>;
  let teamsService: jest.Mocked<TeamsService>;
  let playersService: jest.Mocked<PlayersService>;
  let competitionsService: jest.Mocked<CompetitionsService>;
  let newsService: jest.Mocked<NewsService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SearchReindexService,
        {
          provide: SearchService,
          useValue: {
            indexTeam: jest.fn(),
            indexPlayer: jest.fn(),
            indexCompetition: jest.fn(),
            indexNewsArticle: jest.fn(),
          },
        },
        { provide: TeamsService, useValue: { listForAdmin: jest.fn() } },
        { provide: PlayersService, useValue: { listForAdmin: jest.fn() } },
        { provide: CompetitionsService, useValue: { listForAdmin: jest.fn() } },
        { provide: NewsService, useValue: { listForAdmin: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(SearchReindexService);
    searchService = moduleRef.get(SearchService);
    teamsService = moduleRef.get(TeamsService);
    playersService = moduleRef.get(PlayersService);
    competitionsService = moduleRef.get(CompetitionsService);
    newsService = moduleRef.get(NewsService);

    teamsService.listForAdmin.mockResolvedValue(paginated([]) as never);
    playersService.listForAdmin.mockResolvedValue(paginated([]) as never);
    competitionsService.listForAdmin.mockResolvedValue(paginated([]) as never);
    newsService.listForAdmin.mockResolvedValue(paginated([]) as never);
  });

  it('indexes only active teams, skipping inactive ones', async () => {
    teamsService.listForAdmin.mockResolvedValue(
      paginated([
        {
          id: '1',
          name: 'Active FC',
          slug: 'active-fc',
          country: null,
          logoUrl: null,
          isActive: true,
        },
        {
          id: '2',
          name: 'Retired FC',
          slug: 'retired-fc',
          country: null,
          logoUrl: null,
          isActive: false,
        },
      ]) as never,
    );

    const result = await service.reindexAll();

    expect(searchService.indexTeam).toHaveBeenCalledTimes(1);
    expect(searchService.indexTeam).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1' }),
    );
    expect(result.teams).toBe(2);
  });

  it('indexes only PUBLISHED news (the admin listing already excludes drafts via the status filter)', async () => {
    newsService.listForAdmin.mockResolvedValue(
      paginated([
        { id: '1', title: 'Published', slug: 'published', excerpt: null },
      ]) as never,
    );

    await service.reindexAll();

    expect(newsService.listForAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PUBLISHED' }),
    );
    expect(searchService.indexNewsArticle).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1' }),
    );
  });

  it("derives a player's team name from the nested team relation", async () => {
    playersService.listForAdmin.mockResolvedValue(
      paginated([
        {
          id: '1',
          firstName: 'Kylian',
          lastName: 'Mbappe',
          slug: 'kylian-mbappe',
          position: 'FORWARD',
          team: { name: 'Real Madrid' },
          isActive: true,
        },
      ]) as never,
    );

    await service.reindexAll();

    expect(searchService.indexPlayer).toHaveBeenCalledWith(
      expect.objectContaining({ teamName: 'Real Madrid' }),
    );
  });

  it('returns the count of processed records per entity', async () => {
    teamsService.listForAdmin.mockResolvedValue(
      paginated([
        {
          id: '1',
          name: 'A',
          slug: 'a',
          country: null,
          logoUrl: null,
          isActive: true,
        },
      ]) as never,
    );

    const result = await service.reindexAll();

    expect(result).toEqual({ teams: 1, players: 0, competitions: 0, news: 0 });
  });
});
