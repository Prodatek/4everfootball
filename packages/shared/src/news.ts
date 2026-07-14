export const NewsStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
} as const;

export type NewsStatus = (typeof NewsStatus)[keyof typeof NewsStatus];

export const ALL_NEWS_STATUSES: NewsStatus[] = Object.values(NewsStatus);

export interface NewsAuthorSummary {
  id: string;
  displayName: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  coverImageUrl: string | null;
  status: NewsStatus;
  tags: string[];
  author: NewsAuthorSummary | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
