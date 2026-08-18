import type { Fixture } from "@4ef/shared";

// §5 C1 of MONETISATION_UI_BRIEF.md: "assigned fixtures, cached for
// offline." React Query's own cache is in-memory only and gone on a cold
// reload — a scout who opens the app with no signal needs to see their
// last-known fixture list, not a blank error. Same localStorage idiom as
// offline-queue.ts, one snapshot rather than per-fixture.
const CACHE_KEY = "4ef:scout-fixtures-cache";

export function loadCachedFixtures(): Fixture[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Fixture[]) : null;
  } catch {
    return null;
  }
}

export function saveCachedFixtures(fixtures: Fixture[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(fixtures));
}
