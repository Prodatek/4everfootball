import type { AuthenticatedUser } from "@4ef/shared";
import { apiClient } from "@/lib/api-client";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  displayName: string;
}

interface AuthResponse {
  user: AuthenticatedUser;
  accessToken: string;
}

export async function loginRequest(input: LoginInput): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", input);
  return data;
}

export async function registerRequest(input: RegisterInput): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/register", input);
  return data;
}

export async function refreshRequest(): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/refresh");
  return data;
}

export async function logoutRequest(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function fetchCurrentUser(): Promise<AuthenticatedUser> {
  const { data } = await apiClient.get<AuthenticatedUser>("/users/me");
  return data;
}
