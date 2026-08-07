import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Container } from "@/components/layout/container";
import { NAV_LINKS } from "@/lib/nav-links";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <Container
        size="lg"
        className="flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-col gap-1">
          <Link href="/" className="w-fit">
            <Wordmark />
          </Link>
          <p className="text-sm text-muted-foreground">
            Every kickoff, goal, and final whistle — live.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="font-mono text-xs text-muted-foreground">
          © {new Date().getFullYear()} 4EverFootball
        </p>
      </Container>
    </footer>
  );
}
