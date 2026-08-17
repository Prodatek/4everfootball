import { formatNaira } from "@4ef/shared";
import { cn } from "@/lib/utils";

/**
 * §4.1 of MONETISATION_UI_BRIEF.md: one Money component, every naira figure
 * on every screen goes through it. Formatting logic lives in @4ef/shared
 * (already correct, already used by the API) — this is presentation only.
 */
export function Money({ kobo, className }: { kobo: number; className?: string }) {
  return <span className={cn("tabular-nums", className)}>{formatNaira(kobo)}</span>;
}
