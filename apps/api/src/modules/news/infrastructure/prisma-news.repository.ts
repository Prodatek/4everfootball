import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NewsArticleEntity } from '../domain/news.entity';
import type {
  CreateNewsInput,
  NewsListFilters,
  NewsListResult,
  NewsRepository,
  UpdateNewsInput,
} from '../domain/news.repository';

const authorSelect = { id: true, displayName: true } as const;
const newsInclude = { author: { select: authorSelect } } as const;

@Injectable()
export class PrismaNewsRepository implements NewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(filters: NewsListFilters): Promise<NewsListResult> {
    const where: Prisma.NewsArticleWhereInput = {
      ...(filters.onlyPublished ? { status: 'PUBLISHED' } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.tag ? { tags: { has: filters.tag } } : {}),
      ...(filters.search
        ? { title: { contains: filters.search, mode: 'insensitive' } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.newsArticle.findMany({
        where,
        include: newsInclude,
        orderBy: { [filters.sortBy]: filters.sortOrder },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.newsArticle.count({ where }),
    ]);

    return { items: items.map((item) => new NewsArticleEntity(item)), total };
  }

  async findById(id: string): Promise<NewsArticleEntity | null> {
    const record = await this.prisma.newsArticle.findUnique({
      where: { id },
      include: newsInclude,
    });
    return record ? new NewsArticleEntity(record) : null;
  }

  async findBySlug(slug: string): Promise<NewsArticleEntity | null> {
    const record = await this.prisma.newsArticle.findUnique({
      where: { slug },
      include: newsInclude,
    });
    return record ? new NewsArticleEntity(record) : null;
  }

  async slugExists(slug: string): Promise<boolean> {
    const record = await this.prisma.newsArticle.findUnique({
      where: { slug },
      select: { id: true },
    });
    return record !== null;
  }

  async create(input: CreateNewsInput): Promise<NewsArticleEntity> {
    const record = await this.prisma.newsArticle.create({
      data: input,
      include: newsInclude,
    });
    return new NewsArticleEntity(record);
  }

  async update(id: string, input: UpdateNewsInput): Promise<NewsArticleEntity> {
    try {
      const record = await this.prisma.newsArticle.update({
        where: { id },
        data: input,
        include: newsInclude,
      });
      return new NewsArticleEntity(record);
    } catch {
      throw new NotFoundException('News article not found');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.newsArticle.delete({ where: { id } });
    } catch {
      throw new NotFoundException('News article not found');
    }
  }
}
