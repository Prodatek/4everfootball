import type { NewsArticle, PaginatedResult } from "@4ef/shared";
import { apiClient } from "@/lib/api-client";

export interface NewsQuery {
  page?: number;
  limit?: number;
  search?: string;
  tag?: string;
  sortBy?: "publishedAt" | "createdAt" | "title";
  sortOrder?: "asc" | "desc";
}

export async function fetchNews(query: NewsQuery = {}): Promise<PaginatedResult<NewsArticle>> {
  const { data } = await apiClient.get<PaginatedResult<NewsArticle>>("/news", {
    params: query,
  });
  return data;
}

export async function fetchNewsBySlug(slug: string): Promise<NewsArticle> {
  const { data } = await apiClient.get<NewsArticle>(`/news/${slug}`);
  return data;
}
