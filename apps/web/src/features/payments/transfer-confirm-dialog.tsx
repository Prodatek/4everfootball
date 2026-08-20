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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Money } from "@/components/monetisation/money";
import { ImageUploadField } from "@/features/media/image-upload-field";
import type { PaymentWithOrganisation } from "./api";

interface TransferConfirmDialogProps {
  payment: PaymentWithOrganisation | null;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onConfirm: (details: {
    providerReference?: string;
    transferProofUrl?: string;
    transferNote?: string;
  }) => Promise<void>;
}

// §5 D2: "Manual 'mark paid by transfer' with reference and proof upload."
// Same required-reason shape as CashOverrideDialog (B6) — this is that same
// override concept, generalized from "cash at the venue" to any
// BANK_TRANSFER/CASH payment awaiting confirmation platform-wide.
export function TransferConfirmDialog({
  payment,
  onOpenChange,
  isSubmitting,
  onConfirm,
}: TransferConfirmDialogProps) {
  const [providerReference, setProviderReference] = useState("");
  const [transferProofUrl, setTransferProofUrl] = useState<string | undefined>(undefined);
  const [transferNote, setTransferNote] = useState("");

  const requiresNote = payment?.provider === "CASH";
  const canConfirm = !requiresNote || transferNote.trim().length >= 3;

  function reset() {
    setProviderReference("");
    setTransferProofUrl(undefined);
    setTransferNote("");
  }

  return (
    <Dialog
      open={!!payment}
      onOpenChange={(open) => {
        if (!open) reset();
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as paid by transfer</DialogTitle>
        </DialogHeader>
        {payment && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {payment.organisation.name} — <Money kobo={payment.amountKobo} />. This confirms
              the payment outside the normal flow and is logged against your account as an
              override.
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="transfer-reference">Bank reference (optional)</Label>
              <Input
                id="transfer-reference"
                value={providerReference}
                onChange={(e) => setProviderReference(e.target.value)}
                placeholder="e.g. transaction ID from the bank statement"
              />
            </div>
            <ImageUploadField
              label="Proof of transfer (optional)"
              value={transferProofUrl}
              onChange={setTransferProofUrl}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="transfer-note">
                Note {requiresNote ? "(required for cash)" : "(optional)"}
              </Label>
              <Textarea
                id="transfer-note"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                placeholder="e.g. Confirmed via bank statement dated 18 Aug"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                disabled={!canConfirm || isSubmitting}
                onClick={async () => {
                  await onConfirm({
                    providerReference: providerReference.trim() || undefined,
                    transferProofUrl,
                    transferNote: transferNote.trim() || undefined,
                  });
                  reset();
                }}
              >
                {isSubmitting ? "Saving..." : "Confirm payment"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
