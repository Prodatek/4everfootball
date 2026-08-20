import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GraphicStatus } from "./api";

const CONFIG: Record<GraphicStatus, { label: string; icon: typeof Clock; className?: string }> = {
  PENDING: { label: "Pending", icon: Clock },
  PROCESSING: { label: "Rendering", icon: Loader2 },
  READY: { label: "Ready", icon: CheckCircle2, className: "border-live/40 bg-live/10 text-live" },
  FAILED: { label: "Failed", icon: XCircle, className: "border-destructive/40 bg-destructive/10 text-destructive" },
};

export function GraphicStatusBadge({ status }: { status: GraphicStatus }) {
  const { label, icon: Icon, className } = CONFIG[status];
  return (
    <Badge variant="outline" className={className}>
      <Icon className={`size-3.5 ${status === "PROCESSING" ? "animate-spin" : ""}`} />
      {label}
    </Badge>
  );
}
