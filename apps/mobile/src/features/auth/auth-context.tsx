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
import { loginRequest, logoutRequest, refreshRequest, type LoginInput } from "./api";

// The API itself already restricts event-recording to these three roles
// (@Roles('SUPER_ADMIN','ADMIN','SCOUT') on the backend) — this mirrors that
// exactly rather than inventing a separate mobile-only rule, since a plain
// USER account has nothing to do once logged in here (there's no public
// registration screen; scout/admin accounts are provisioned via the web
// admin panel).
const PRIVILEGED_ROLES = ["SCOUT", "ADMIN", "SUPER_ADMIN"];

function isPrivileged(user: AuthenticatedUser): boolean {
  return user.roles.some((role) => PRIVILEGED_ROLES.includes(role));
}

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
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
        if (isPrivileged(refreshedUser)) {
          setAccessToken(accessToken);
          setUser(refreshedUser);
        } else {
          // A non-privileged account refreshed successfully but has nothing
          // to do here — fall back to the public browsing UI quietly, no
          // error shown (the user didn't take an explicit action).
          setAccessToken(null);
          setUser(null);
        }
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

    if (!isPrivileged(loggedInUser)) {
      // The login call already set a valid refresh_token cookie server-side
      // regardless of role — revoke it (logout reads the cookie directly,
      // no bearer token needed) rather than leaving a live session for an
      // account this app refuses to use.
      await logoutRequest().catch(() => undefined);
      throw new Error("This app is for authorized scouts and admins only.");
    }

    setAccessToken(accessToken);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest().catch(() => undefined);
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
