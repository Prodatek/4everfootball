import type { DashboardSummary } from "@4ef/shared";
import { apiClient } from "@/lib/api-client";

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>("/dashboard/summary");
  return data;
}
