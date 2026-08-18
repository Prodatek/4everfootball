"use client";

import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOnlineStatus } from "./use-online-status";

interface SyncStatusIndicatorProps {
  pendingCount: number;
  stuckCount: number;
  onSyncNow: () => void;
}

/**
 * Brief §4.4, exact states: "Online · synced" / "Offline · N events
 * queued" / "Syncing…" / "Sync failed · retry." Always rendered, never
 * conditionally hidden at zero — a persistent presence is the point.
 */
export function SyncStatusIndicator({ pendingCount, stuckCount, onSyncNow }: SyncStatusIndicatorProps) {
  const isOnline = useOnlineStatus();

  let label: string;
  let icon: React.ReactNode;
  let tone: "ok" | "warn" | "neutral" = "neutral";

  if (!isOnline) {
    label = pendingCount > 0 ? `Offline · ${pendingCount} queued` : "Offline";
    icon = <WifiOff className="size-3.5" />;
    tone = "warn";
  } else if (stuckCount > 0) {
    label = "Sync failed · retry";
    icon = <WifiOff className="size-3.5" />;
    tone = "warn";
  } else if (pendingCount > 0) {
    label = `Syncing ${pendingCount}...`;
    icon = <Loader2 className="size-3.5 animate-spin" />;
    tone = "neutral";
  } else {
    label = "Online · synced";
    icon = <span className="size-1.5 rounded-full bg-live" />;
    tone = "ok";
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs",
        tone === "warn" && "border-destructive/40 bg-destructive/10 text-destructive",
        tone === "ok" && "border-border bg-muted/50 text-live",
        tone === "neutral" && "border-border bg-muted/50 text-muted-foreground",
      )}
    >
      <span className="flex items-center gap-1.5 font-medium">
        {icon}
        {label}
      </span>
      <Button
        type="button"
        size="xs"
        variant="ghost"
        onClick={onSyncNow}
        className="h-auto p-1 text-current hover:bg-current/10"
      >
        <RefreshCw className="size-3" />
        Sync now
      </Button>
    </div>
  );
}
