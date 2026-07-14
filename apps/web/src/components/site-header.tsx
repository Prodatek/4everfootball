"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function resolveAdminHref(roles: string[]): string | null {
  if (roles.includes("ADMIN") || roles.includes("SUPER_ADMIN")) return "/admin";
  if (roles.includes("EDITOR")) return "/admin/news";
  if (roles.includes("SCOUT")) return "/admin/scouting";
  return null;
}

export function SiteHeader() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const adminHref = user ? resolveAdminHref(user.roles) : null;

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
      <Link href="/" className="shrink-0 font-semibold tracking-tight">
        4EverFootball
      </Link>

      <form onSubmit={handleSearchSubmit} className="hidden max-w-xs flex-1 sm:block">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search teams, players..."
            className="pl-7"
          />
        </div>
      </form>

      <nav className="flex items-center gap-4 text-sm">
        <Link href="/teams" className="text-muted-foreground hover:text-foreground">
          Teams
        </Link>
        <Link href="/players" className="text-muted-foreground hover:text-foreground">
          Players
        </Link>
        <Link
          href="/competitions"
          className="text-muted-foreground hover:text-foreground"
        >
          Competitions
        </Link>
        <Link href="/fixtures" className="text-muted-foreground hover:text-foreground">
          Fixtures
        </Link>
        <Link href="/news" className="text-muted-foreground hover:text-foreground">
          News
        </Link>
        {!isLoading && user && (
          <>
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
            {adminHref && (
              <Link href={adminHref} className="text-muted-foreground hover:text-foreground">
                Admin
              </Link>
            )}
          </>
        )}
        {!isLoading && !user && (
          <Button size="sm" render={<Link href="/login" />}>
            Log in
          </Button>
        )}
      </nav>
    </header>
  );
}
