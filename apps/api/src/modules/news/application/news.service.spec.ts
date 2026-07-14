import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NewsService } from './news.service';
import { NEWS_REPOSITORY } from '../domain/news.repository';
import type { NewsRepository } from '../domain/news.repository';
import { SearchService } from '../../search/application/search.service';

describe('NewsService', () => {
  let service: NewsService;
  let repository: jest.Mocked<NewsRepository>;
  let searchService: jest.Mocked<SearchService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NewsService,
        {
          provide: NEWS_REPOSITORY,
          useValue: {
            findMany: jest.fn(),
            findById: jest.fn(),
            findBySlug: jest.fn(),
            slugExists: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: SearchService,
          useValue: {
            indexNewsArticle: jest.fn(),
            deleteNewsArticle: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(NewsService);
    repository = moduleRef.get(NEWS_REPOSITORY);
    searchService = moduleRef.get(SearchService);
  });

  it('defaults to DRAFT status and no publishedAt when creating without a status', async () => {
    repository.slugExists.mockResolvedValue(false);
    repository.create.mockResolvedValue({
      toPublic: () => ({ id: '1', status: 'DRAFT' }),
    } as never);

    await service.create(
      { title: 'Match report', body: '...' } as never,
      'author-1',
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'DRAFT', publishedAt: undefined }),
    );
  });

  it('sets publishedAt when created directly as PUBLISHED', async () => {
    repository.slugExists.mockResolvedValue(false);
    repository.create.mockResolvedValue({
      toPublic: () => ({ id: '1', status: 'PUBLISHED' }),
    } as never);

    await service.create(
      { title: 'Match report', body: '...', status: 'PUBLISHED' } as never,
      'author-1',
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'PUBLISHED',
        publishedAt: expect.any(Date),
      }),
    );
  });

  it('stamps publishedAt the first time an article transitions from DRAFT to PUBLISHED', async () => {
    repository.findById.mockResolvedValue({
      toPublic: () => ({ status: 'DRAFT', publishedAt: null }),
    } as never);
    repository.update.mockResolvedValue({ toPublic: () => ({}) } as never);

    await service.update('1', { status: 'PUBLISHED' } as never);

    expect(repository.update).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ publishedAt: expect.any(Date) }),
    );
  });

  it('does not re-stamp publishedAt for an already-published article', async () => {
    const originalDate = new Date('2026-01-01T00:00:00.000Z');
    repository.findById.mockResolvedValue({
      toPublic: () => ({ status: 'PUBLISHED', publishedAt: originalDate }),
    } as never);
    repository.update.mockResolvedValue({ toPublic: () => ({}) } as never);

    await service.update('1', { title: 'Updated title' } as never);

    expect(repository.update).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ publishedAt: originalDate }),
    );
  });

  it('throws NotFoundException for an unpublished slug', async () => {
    repository.findBySlug.mockResolvedValue({
      toPublic: () => ({ status: 'DRAFT' }),
      status: 'DRAFT',
    } as never);

    await expect(
      service.getPublishedBySlug('draft-article'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the article for a published slug', async () => {
    repository.findBySlug.mockResolvedValue({
      toPublic: () => ({ id: '1', status: 'PUBLISHED' }),
      status: 'PUBLISHED',
    } as never);

    const result = await service.getPublishedBySlug('published-article');
    expect(result).toEqual({ id: '1', status: 'PUBLISHED' });
  });

  it('adds a published article to the search index', async () => {
    repository.slugExists.mockResolvedValue(false);
    repository.create.mockResolvedValue({
      toPublic: () => ({
        id: '1',
        title: 'Match report',
        slug: 'match-report',
        excerpt: null,
        status: 'PUBLISHED',
      }),
    } as never);

    await service.create(
      { title: 'Match report', body: '...', status: 'PUBLISHED' } as never,
      'author-1',
    );

    expect(searchService.indexNewsArticle).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1', slug: 'match-report' }),
    );
    expect(searchService.deleteNewsArticle).not.toHaveBeenCalled();
  });

  it('removes a draft article from the search index instead of indexing it', async () => {
    repository.slugExists.mockResolvedValue(false);
    repository.create.mockResolvedValue({
      toPublic: () => ({ id: '1', slug: 'draft-report', status: 'DRAFT' }),
    } as never);

    await service.create(
      { title: 'Draft report', body: '...' } as never,
      'author-1',
    );

    expect(searchService.deleteNewsArticle).toHaveBeenCalledWith('1');
    expect(searchService.indexNewsArticle).not.toHaveBeenCalled();
  });
});
