export const Role = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  SCOUT: "SCOUT",
  EDITOR: "EDITOR",
  USER: "USER",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ALL_ROLES: Role[] = Object.values(Role);
