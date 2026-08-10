import type { SearchResults } from "@4ef/shared";
import { apiClient } from "@/lib/api-client";

export async function search(q: string, limit = 5): Promise<SearchResults> {
  const { data } = await apiClient.get<SearchResults>("/search", {
    params: { q, limit },
  });
  return data;
}
