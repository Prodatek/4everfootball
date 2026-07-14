import type { Role } from "./roles";

export interface AdminUserSummary {
  id: string;
  email: string;
  displayName: string;
  roles: Role[];
  isActive: boolean;
  createdAt: string;
}
