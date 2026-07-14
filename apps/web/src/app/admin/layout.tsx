"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@4ef/shared";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/auth-context";

const NAV_LINKS: { href: string; label: string; roles: Role[] }[] = [
  { href: "/admin", label: "Dashboard", roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/admin/scouting", label: "Live Scouting", roles: ["SCOUT", "ADMIN", "SUPER_ADMIN"] },
  { href: "/admin/teams", label: "Teams", roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/admin/players", label: "Players", roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/admin/competitions", label: "Competitions", roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/admin/fixtures", label: "Fixtures", roles: ["ADMIN", "SUPER_ADMIN"] },
  { href: "/admin/news", label: "News", roles: ["ADMIN", "SUPER_ADMIN", "EDITOR"] },
  { href: "/admin/media", label: "Media", roles: ["ADMIN", "SUPER_ADMIN", "EDITOR"] },
  { href: "/admin/users", label: "Users", roles: ["ADMIN", "SUPER_ADMIN"] },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const visibleLinks = user
    ? NAV_LINKS.filter((link) => link.roles.some((role) => user.roles.includes(role)))
    : [];

  useEffect(() => {
    if (!isLoading && visibleLinks.length === 0) {
      router.replace("/dashboard");
    }
  }, [isLoading, visibleLinks.length, router]);

  if (isLoading || visibleLinks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <aside className="hidden w-56 shrink-0 border-r p-4 sm:block">
        <nav className="flex flex-col gap-1">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm hover:bg-muted",
                pathname === link.href
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
