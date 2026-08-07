import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-display text-lg uppercase tracking-wide",
        className,
      )}
    >
      <span className="text-primary">4Ever</span>
      <span className="text-foreground">Football</span>
    </span>
  );
}
