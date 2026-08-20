"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { generateTermlyReport, type TermlyReportResult } from "@/features/academy/api";

interface TermlyReportDialogProps {
  organisationId: string;
  ageGroupId: string;
  playerId: string;
  playerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function defaultFrom(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().slice(0, 10);
}

// §5 F4: "Generate per term, preview, export PDF, share to a parent by
// link. The share flow should assume WhatsApp." The backend already
// returns dataset + PDF url + a wa.me link in one call — this dialog is
// the entire scope of that requirement, not a new route, since it's
// fundamentally "generate and hand over one document," the same shape as
// C3/E-phase's dialogs-on-an-existing-surface pattern.
export function TermlyReportDialog({
  organisationId,
  ageGroupId,
  playerId,
  playerName,
  open,
  onOpenChange,
}: TermlyReportDialogProps) {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<TermlyReportResult | null>(null);

  const mutation = useMutation({
    mutationFn: () => generateTermlyReport(organisationId, ageGroupId, playerId, from, to),
    onSuccess: (data) => setResult(data),
    onError: () => toast.error("Failed to generate report"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setResult(null);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Development report — {playerName}</DialogTitle>
        </DialogHeader>

        {!result && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="report-from">From</Label>
                <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="report-to">To</Label>
                <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
                {mutation.isPending ? "Generating..." : "Generate report"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{result.dataset.periodLabel}</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="font-heading text-xl">{result.dataset.attendance.ratePercent}%</p>
                <p className="text-xs text-muted-foreground">Attendance</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="font-heading text-xl">{result.dataset.goals}</p>
                <p className="text-xs text-muted-foreground">Goals</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="font-heading text-xl">{result.dataset.assists}</p>
                <p className="text-xs text-muted-foreground">Assists</p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                render={<a href={result.url} target="_blank" rel="noopener noreferrer" />}
              >
                Download PDF
              </Button>
              <Button
                type="button"
                render={<a href={result.whatsappUrl} target="_blank" rel="noopener noreferrer" />}
              >
                Share to parent via WhatsApp
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
