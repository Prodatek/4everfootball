"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Money } from "@/components/monetisation/money";

interface CashOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerCount: number;
  totalKobo: number;
  onConfirm: (reason: string) => Promise<void>;
  isSubmitting: boolean;
}

// §5 B6: "must capture a reason and show that the record is marked as an
// override, because it is logged." The reason is mandatory — see the
// API's requirement that a CASH confirm-transfer always carries a
// non-empty transferNote.
export function CashOverrideDialog({
  open,
  onOpenChange,
  playerCount,
  totalKobo,
  onConfirm,
  isSubmitting,
}: CashOverrideDialogProps) {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as paid by cash</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Marking {playerCount} player{playerCount === 1 ? "" : "s"} (
            <Money kobo={totalKobo} />) as paid outside the normal payment flow. This is logged
            against your account and shown as an override.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="override-reason">Reason</Label>
            <Textarea
              id="override-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Paid in cash at the venue on match day, receipt #114"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              disabled={reason.trim().length < 3 || isSubmitting}
              onClick={async () => {
                await onConfirm(reason);
                setReason("");
              }}
            >
              {isSubmitting ? "Saving..." : "Confirm override"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
