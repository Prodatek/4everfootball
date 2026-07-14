"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthenticatedUser } from "@4ef/shared";
import { setAccessToken } from "@/lib/api-client";
import {
  loginRequest,
  logoutRequest,
  refreshRequest,
  registerRequest,
  type LoginInput,
  type RegisterInput,
} from "./api";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const { user: refreshedUser, accessToken } = await refreshRequest();
        if (cancelled) return;
        setAccessToken(accessToken);
        setUser(refreshedUser);
      } catch {
        if (cancelled) return;
        setAccessToken(null);
        setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const { user: loggedInUser, accessToken } = await loginRequest(input);
    setAccessToken(accessToken);
    setUser(loggedInUser);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const { user: registeredUser, accessToken } = await registerRequest(input);
    setAccessToken(accessToken);
    setUser(registeredUser);
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest().catch(() => undefined);
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return ctx;
}
