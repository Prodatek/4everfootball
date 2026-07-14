import type { ReindexSummary, SearchResults } from "@4ef/shared";
import { apiClient } from "@/lib/api-client";

export async function search(q: string, limit = 5): Promise<SearchResults> {
  const { data } = await apiClient.get<SearchResults>("/search", {
    params: { q, limit },
  });
  return data;
}

export async function triggerReindex(): Promise<ReindexSummary> {
  const { data } = await apiClient.post<ReindexSummary>("/search/reindex");
  return data;
}
