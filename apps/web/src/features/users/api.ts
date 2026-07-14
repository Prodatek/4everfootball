import type { AdminUserSummary, PaginatedResult, Role } from "@4ef/shared";
import { apiClient } from "@/lib/api-client";

export interface UsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "displayName" | "email" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface UpdateUserRolesInput {
  roles?: Role[];
  isActive?: boolean;
}

export async function fetchUsers(
  query: UsersQuery = {},
): Promise<PaginatedResult<AdminUserSummary>> {
  const { data } = await apiClient.get<PaginatedResult<AdminUserSummary>>(
    "/users/admin/all",
    { params: query },
  );
  return data;
}

export async function updateUserRoles(
  id: string,
  input: UpdateUserRolesInput,
): Promise<AdminUserSummary> {
  const { data } = await apiClient.patch<AdminUserSummary>(`/users/${id}/roles`, input);
  return data;
}
