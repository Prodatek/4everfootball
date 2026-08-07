"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/brand/wordmark";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NAV_LINKS } from "@/lib/nav-links";

const mobileLinkClassName =
  "rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const adminHref = user ? resolveAdminHref(user.roles) : null;

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      setMobileOpen(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 sm:px-6">
      <Link href="/" className="shrink-0">
        <Wordmark />
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

      <nav className="hidden items-center gap-4 text-sm sm:flex">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-muted-foreground hover:text-primary"
          >
            {link.label}
          </Link>
        ))}
        {!isLoading && user && (
          <>
            <Link href="/dashboard" className="text-muted-foreground hover:text-primary">
              Dashboard
            </Link>
            {adminHref && (
              <Link href={adminHref} className="text-muted-foreground hover:text-primary">
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

      <div className="sm:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open menu" />}>
            <Menu className="size-4" />
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>
                <Wordmark />
              </SheetTitle>
            </SheetHeader>
            <form onSubmit={handleSearchSubmit} className="px-4">
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
            <nav className="flex flex-col gap-1 px-2">
              {NAV_LINKS.map((link) => (
                <SheetClose
                  key={link.href}
                  render={<Link href={link.href} />}
                  className={mobileLinkClassName}
                >
                  {link.label}
                </SheetClose>
              ))}
              {!isLoading && user && (
                <>
                  <SheetClose render={<Link href="/dashboard" />} className={mobileLinkClassName}>
                    Dashboard
                  </SheetClose>
                  {adminHref && (
                    <SheetClose render={<Link href={adminHref} />} className={mobileLinkClassName}>
                      Admin
                    </SheetClose>
                  )}
                </>
              )}
              {!isLoading && !user && (
                <SheetClose
                  render={<Link href="/login" />}
                  className="mt-2 rounded-md bg-primary px-2 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/80"
                >
                  Log in
                </SheetClose>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
