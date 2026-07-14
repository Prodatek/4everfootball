import type { NewsArticle, NewsStatus, PaginatedResult } from "@4ef/shared";
import { apiClient } from "@/lib/api-client";

export interface NewsQuery {
  page?: number;
  limit?: number;
  search?: string;
  tag?: string;
  status?: NewsStatus;
  sortBy?: "publishedAt" | "createdAt" | "title";
  sortOrder?: "asc" | "desc";
}

export interface NewsInput {
  title: string;
  excerpt?: string;
  body: string;
  coverImageUrl?: string;
  status?: NewsStatus;
  tags?: string[];
}

export async function fetchNews(query: NewsQuery = {}): Promise<PaginatedResult<NewsArticle>> {
  const { data } = await apiClient.get<PaginatedResult<NewsArticle>>("/news", {
    params: query,
  });
  return data;
}

export async function fetchNewsForAdmin(
  query: NewsQuery = {},
): Promise<PaginatedResult<NewsArticle>> {
  const { data } = await apiClient.get<PaginatedResult<NewsArticle>>("/news/admin/all", {
    params: query,
  });
  return data;
}

export async function fetchNewsBySlug(slug: string): Promise<NewsArticle> {
  const { data } = await apiClient.get<NewsArticle>(`/news/${slug}`);
  return data;
}

export async function createNews(input: NewsInput): Promise<NewsArticle> {
  const { data } = await apiClient.post<NewsArticle>("/news", input);
  return data;
}

export async function updateNews(
  id: string,
  input: Partial<NewsInput>,
): Promise<NewsArticle> {
  const { data } = await apiClient.patch<NewsArticle>(`/news/${id}`, input);
  return data;
}

export async function deleteNews(id: string): Promise<void> {
  await apiClient.delete(`/news/${id}`);
}
