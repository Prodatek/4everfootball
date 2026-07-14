import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  paginate,
  type PaginatedResult,
} from '../../../common/dto/paginated-result';
import { slugify } from '../../../common/utils/slugify';
import { SearchService } from '../../search/application/search.service';
import { NEWS_REPOSITORY } from '../domain/news.repository';
import type { NewsRepository } from '../domain/news.repository';
import type { CreateNewsDto } from './dto/create-news.dto';
import type { QueryNewsDto } from './dto/query-news.dto';
import type { UpdateNewsDto } from './dto/update-news.dto';

@Injectable()
export class NewsService {
  constructor(
    @Inject(NEWS_REPOSITORY) private readonly newsRepository: NewsRepository,
    private readonly searchService: SearchService,
  ) {}

  async list(query: QueryNewsDto): Promise<PaginatedResult<unknown>> {
    return this.findPaginated(query, true);
  }

  async listForAdmin(query: QueryNewsDto): Promise<PaginatedResult<unknown>> {
    return this.findPaginated(query, false);
  }

  private async findPaginated(query: QueryNewsDto, onlyPublished: boolean) {
    const { items, total } = await this.newsRepository.findMany({
      page: query.page,
      limit: query.limit,
      search: query.search,
      tag: query.tag,
      status: query.status,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      onlyPublished,
    });

    return paginate(
      items.map((item) => item.toPublic()),
      total,
      query.page,
      query.limit,
    );
  }

  async getPublishedBySlug(slug: string) {
    const article = await this.newsRepository.findBySlug(slug);

    if (!article || article.status !== 'PUBLISHED') {
      throw new NotFoundException('News article not found');
    }

    return article.toPublic();
  }

  async create(dto: CreateNewsDto, authorId?: string) {
    const slug = await this.generateUniqueSlug(dto.title);
    const status = dto.status ?? 'DRAFT';

    const article = await this.newsRepository.create({
      ...dto,
      slug,
      status,
      authorId,
      publishedAt: status === 'PUBLISHED' ? new Date() : undefined,
    });
    const publicArticle = article.toPublic();

    this.syncSearchIndex(publicArticle);

    return publicArticle;
  }

  async update(id: string, dto: UpdateNewsDto) {
    const existing = await this.newsRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('News article not found');
    }

    const existingPublic = existing.toPublic();
    const isNewlyPublished =
      dto.status === 'PUBLISHED' && existingPublic.status !== 'PUBLISHED';

    const article = await this.newsRepository.update(id, {
      ...dto,
      publishedAt: isNewlyPublished
        ? new Date()
        : (existingPublic.publishedAt ?? undefined),
    });
    const publicArticle = article.toPublic();

    this.syncSearchIndex(publicArticle);

    return publicArticle;
  }

  async remove(id: string) {
    const existing = await this.newsRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('News article not found');
    }

    await this.newsRepository.delete(id);
    void this.searchService.deleteNewsArticle(id);
  }

  /** Only PUBLISHED articles are searchable, mirroring getPublishedBySlug(). */
  private syncSearchIndex(article: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    status: string;
  }) {
    if (article.status === 'PUBLISHED') {
      void this.searchService.indexNewsArticle({
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
      });
    } else {
      void this.searchService.deleteNewsArticle(article.id);
    }
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title);

    if (!base) {
      throw new ConflictException(
        'News title must contain at least one letter or number',
      );
    }

    let candidate = base;
    let suffix = 2;

    while (await this.newsRepository.slugExists(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
