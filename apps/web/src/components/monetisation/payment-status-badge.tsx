import { CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PaymentStatus } from "@/features/payments/api";

// No semantic success/warning Badge variant exists (see
// MONETISATION_UI_INVENTORY.md §15.2) — reuses the one real status colour
// the app already has (`--live`, used today on the homepage's live-match
// indicator) for "paid", existing Badge variants for everything else.
// Colour is never the only signal (brief §4.6): every state pairs an icon
// and a word.
const CONFIG: Record<PaymentStatus, { label: string; icon: typeof Clock; className?: string }> = {
  PENDING: { label: "Awaiting confirmation", icon: Clock },
  PAID: { label: "Paid", icon: CheckCircle2, className: "border-live/40 bg-live/10 text-live" },
  FAILED: { label: "Failed", icon: XCircle, className: "border-destructive/40 bg-destructive/10 text-destructive" },
  REFUNDED: { label: "Refunded", icon: AlertTriangle },
  ABANDONED: { label: "Expired", icon: AlertTriangle },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { label, icon: Icon, className } = CONFIG[status];
  return (
    <Badge variant="outline" className={className}>
      <Icon className="size-3.5" />
      {label}
    </Badge>
  );
}
