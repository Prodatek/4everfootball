import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SearchIndexService } from './search-index.service';

const mockIndex = {
  addDocuments: jest.fn(),
  deleteDocument: jest.fn(),
  search: jest.fn(),
};

jest.mock('meilisearch', () => ({
  MeiliSearch: jest.fn().mockImplementation(() => ({
    index: jest.fn(() => mockIndex),
  })),
}));

describe('SearchIndexService', () => {
  let service: SearchIndexService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        SearchIndexService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => 'test-value') },
        },
      ],
    }).compile();

    service = moduleRef.get(SearchIndexService);
  });

  it('swallows an indexing failure rather than throwing', async () => {
    mockIndex.addDocuments.mockRejectedValue(new Error('Meilisearch is down'));

    await expect(
      service.upsertDocument('teams', { id: '1', name: 'Arsenal' }),
    ).resolves.toBeUndefined();
  });

  it('swallows a delete failure rather than throwing', async () => {
    mockIndex.deleteDocument.mockRejectedValue(
      new Error('Meilisearch is down'),
    );

    await expect(service.deleteDocument('teams', '1')).resolves.toBeUndefined();
  });

  it('returns an empty array instead of throwing when a search fails', async () => {
    mockIndex.search.mockRejectedValue(new Error('Meilisearch is down'));

    await expect(service.search('teams', 'arsenal', 5)).resolves.toEqual([]);
  });

  it('returns hits from a successful search', async () => {
    mockIndex.search.mockResolvedValue({
      hits: [{ id: '1', name: 'Arsenal' }],
    });

    await expect(service.search('teams', 'arsenal', 5)).resolves.toEqual([
      { id: '1', name: 'Arsenal' },
    ]);
  });
});
