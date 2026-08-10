import axios from "axios";
import { API_URL } from "./env";

// Ported from apps/web/src/lib/api-client.ts. `withCredentials` here relies
// on the native HTTP stack's own cookie jar (iOS NSURLSession / Android
// OkHttp via RN's ForwardingCookieHandler) automatically storing and
// replaying the httpOnly refresh_token cookie the API sets on login/refresh
// — the same mechanism a browser uses, just at the native layer instead of
// JS. No cookie-jar library needed unless the Phase 0 device spike shows
// this isn't reliable, in which case see the plan's Fallback approach.
export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await apiClient.post("/auth/refresh");
    const token: string = response.data.accessToken;
    setAccessToken(token);
    return token;
  } catch {
    setAccessToken(null);
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== "/auth/refresh" &&
      originalRequest.url !== "/auth/login"
    ) {
      originalRequest._retry = true;

      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });

      const newToken = await refreshPromise;

      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  },
);
