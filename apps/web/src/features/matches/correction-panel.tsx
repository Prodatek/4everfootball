"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { MatchEvent } from "@4ef/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MATCH_EVENT_LABELS } from "./event-labels";
import type { RecordMatchEventInput } from "./api";

interface CorrectionPanelProps {
  event: MatchEvent;
  onConfirm: (input: RecordMatchEventInput) => void;
  onDismiss: () => void;
}

/**
 * Brief §5 C2: "Corrections are a deliberate, slightly slower flow
 * requiring a reason — they are a new record, not an edit, and the UI
 * should make that legible rather than hiding it." Deliberately separate
 * from EventCapturePanel (not a shared generic form) so this reads as its
 * own, slower, more considered action — the original event stays printed
 * at the top, untouched and un-editable, the whole time.
 */
export function CorrectionPanel({ event, onConfirm, onDismiss }: CorrectionPanelProps) {
  const [reason, setReason] = useState("");
  const canConfirm = reason.trim().length >= 3;

  function handleConfirm() {
    onConfirm({
      clientEventId: crypto.randomUUID(),
      type: "CORRECTION",
      minute: event.minute,
      correctsEventId: event.id,
      correctionReason: reason,
    });
    onDismiss();
  }

  return (
    <div
      role="region"
      aria-label="File a correction"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[65vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-t-xl border border-destructive/40 bg-card p-4 shadow-lg ring-1 ring-foreground/10"
    >
      <div className="flex items-center justify-between">
        <p className="font-heading text-lg uppercase">File a correction</p>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onDismiss} aria-label="Dismiss">
          <X className="size-4" />
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
        <p className="text-xs text-muted-foreground">
          This record stays exactly as recorded — a correction is a new event that retracts it,
          it never edits or removes the original.
        </p>
        <p className="mt-2 font-medium">
          {event.minute}&apos; · {MATCH_EVENT_LABELS[event.type]}
          {event.player && ` — ${event.player.firstName} ${event.player.lastName}`}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="correction-reason">Why is this being corrected?</Label>
        <Textarea
          id="correction-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Recorded as a yellow card by mistake — it was a red"
        />
      </div>

      <Button
        size="lg"
        variant="destructive"
        disabled={!canConfirm}
        onClick={handleConfirm}
        className="h-14 text-base"
      >
        File correction
      </Button>
    </div>
  );
}
