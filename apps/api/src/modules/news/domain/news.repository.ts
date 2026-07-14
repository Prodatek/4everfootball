import type { NewsStatus } from '@prisma/client';
import type { NewsArticleEntity } from './news.entity';

export const NEWS_REPOSITORY = Symbol('NEWS_REPOSITORY');

export type NewsSortField = 'publishedAt' | 'createdAt' | 'title';
export type SortOrder = 'asc' | 'desc';

export interface NewsListFilters {
  page: number;
  limit: number;
  search?: string;
  tag?: string;
  status?: NewsStatus;
  sortBy: NewsSortField;
  sortOrder: SortOrder;
  onlyPublished: boolean;
}

export interface NewsListResult {
  items: NewsArticleEntity[];
  total: number;
}

export interface CreateNewsInput {
  title: string;
  slug: string;
  excerpt?: string;
  body: string;
  coverImageUrl?: string;
  status?: NewsStatus;
  tags?: string[];
  authorId?: string;
  publishedAt?: Date;
}

export type UpdateNewsInput = Partial<
  Omit<CreateNewsInput, 'slug' | 'authorId'>
> & {
  slug?: string;
};

export interface NewsRepository {
  findMany(filters: NewsListFilters): Promise<NewsListResult>;
  findById(id: string): Promise<NewsArticleEntity | null>;
  findBySlug(slug: string): Promise<NewsArticleEntity | null>;
  slugExists(slug: string): Promise<boolean>;
  create(input: CreateNewsInput): Promise<NewsArticleEntity>;
  update(id: string, input: UpdateNewsInput): Promise<NewsArticleEntity>;
  delete(id: string): Promise<void>;
}
