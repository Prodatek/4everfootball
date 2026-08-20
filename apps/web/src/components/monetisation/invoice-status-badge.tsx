import { CheckCircle2, Clock, FileEdit, XCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@/features/invoices/api";

// Same reasoning as PaymentStatusBadge — --live for the "money has landed"
// state, existing Badge variants for everything else, icon+word always
// paired (brief §4.6).
const CONFIG: Record<InvoiceStatus, { label: string; icon: typeof Clock; className?: string }> = {
  DRAFT: { label: "Draft", icon: FileEdit },
  SENT: { label: "Awaiting payment", icon: Clock },
  PART_PAID: { label: "Partly paid", icon: Clock, className: "border-live/40 bg-live/10 text-live" },
  PAID: { label: "Paid", icon: CheckCircle2, className: "border-live/40 bg-live/10 text-live" },
  CANCELLED: { label: "Cancelled", icon: XCircle },
  EXPIRED: { label: "Expired", icon: AlertTriangle, className: "border-destructive/40 bg-destructive/10 text-destructive" },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, icon: Icon, className } = CONFIG[status];
  return (
    <Badge variant="outline" className={className}>
      <Icon className="size-3.5" />
      {label}
    </Badge>
  );
}
