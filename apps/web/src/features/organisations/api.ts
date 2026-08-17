import type { PaginatedResult } from "@4ef/shared";
import { apiClient } from "@/lib/api-client";

// No Organisation type exists yet in @4ef/shared (unlike Team/Player/
// Competition) — defined locally here rather than adding one to the shared
// package for this pass.
export type OrganisationType =
  | "ORGANISER"
  | "ACADEMY"
  | "SCHOOL_LEAGUE"
  | "FEDERATION"
  | "CLUB";

export type OrganisationMemberRole = "OWNER" | "ADMIN" | "RECORDER" | "VIEWER" | "COACH";

export interface Organisation {
  id: string;
  name: string;
  type: OrganisationType;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  rcNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganisationMember {
  userId: string;
  role: OrganisationMemberRole;
  createdAt: string;
  user: { id: string; displayName: string; email: string };
}

export interface OrganisationInput {
  name: string;
  type: OrganisationType;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  rcNumber?: string;
}

export interface OrganisationsQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export async function fetchOrganisations(
  query: OrganisationsQuery = {},
): Promise<PaginatedResult<Organisation>> {
  const { data } = await apiClient.get<PaginatedResult<Organisation>>(
    "/organisations/admin/all",
    { params: query },
  );
  return data;
}

export async function fetchMyOrganisations(): Promise<Organisation[]> {
  const { data } = await apiClient.get<Organisation[]>("/organisations/mine");
  return data;
}

export async function fetchOrganisationById(id: string): Promise<Organisation> {
  const { data } = await apiClient.get<Organisation>(`/organisations/${id}`);
  return data;
}

export async function createOrganisation(input: OrganisationInput): Promise<Organisation> {
  const { data } = await apiClient.post<Organisation>("/organisations", input);
  return data;
}

export async function fetchOrganisationMembers(
  organisationId: string,
): Promise<OrganisationMember[]> {
  const { data } = await apiClient.get<OrganisationMember[]>(
    `/organisations/${organisationId}/members`,
  );
  return data;
}

export async function addOrganisationMember(
  organisationId: string,
  userId: string,
  role: OrganisationMemberRole,
): Promise<OrganisationMember> {
  const { data } = await apiClient.post<OrganisationMember>(
    `/organisations/${organisationId}/members`,
    { userId, role },
  );
  return data;
}
