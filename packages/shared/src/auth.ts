import type { Role } from "./roles";

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  roles: Role[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtAccessPayload {
  sub: string;
  email: string;
  roles: Role[];
}

export interface JwtRefreshPayload {
  sub: string;
  tokenId: string;
}
