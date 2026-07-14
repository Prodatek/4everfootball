import type { NewsStatus } from '@prisma/client';

export interface NewsAuthorSummary {
  id: string;
  displayName: string;
}

export interface NewsArticleProps {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  coverImageUrl: string | null;
  status: NewsStatus;
  tags: string[];
  author: NewsAuthorSummary | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class NewsArticleEntity {
  constructor(private readonly props: NewsArticleProps) {}

  get id() {
    return this.props.id;
  }

  get slug() {
    return this.props.slug;
  }

  get status() {
    return this.props.status;
  }

  toPublic() {
    return { ...this.props };
  }
}
