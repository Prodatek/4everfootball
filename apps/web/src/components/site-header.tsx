"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ADMIN_LINKS = [
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/competitions", label: "Competitions" },
  { href: "/admin/fixtures", label: "Fixtures" },
];

export function SiteHeader() {
  const { user, isLoading } = useAuth();
  const isAdmin =
    !!user && (user.roles.includes("ADMIN") || user.roles.includes("SUPER_ADMIN"));

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <Link href="/" className="font-semibold tracking-tight">
        4EverFootball
      </Link>
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
        {!isLoading && user && (
          <>
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground" />
                  }
                >
                  Manage
                  <ChevronDown className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {ADMIN_LINKS.map((link) => (
                    <DropdownMenuItem key={link.href} render={<Link href={link.href} />}>
                      {link.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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
