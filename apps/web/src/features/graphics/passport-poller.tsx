"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The passport graphic renders async (a worker polls every 5s server-side,
// per GraphicsWorkerService) — this Server Component page can't just wait,
// so a brand-new player's first ever passport view shows a "generating"
// state that quietly re-fetches until the image exists, rather than
// leaving them on a dead page.
export function PassportPoller() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(interval);
  }, [router]);

  return null;
}
