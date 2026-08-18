"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { verifyMatchEvents } from "@/features/matches/api";

/**
 * Brief §5 C3: "A sales feature. An organiser will click it during your
 * demo." Purely additive to the existing public fixture page — this file
 * is the only thing that page imports for it. Renders nothing at all
 * (§6's rule: zero visual change when there's nothing to show) unless the
 * chain is both present and valid — a broken chain is an internal signal,
 * never surfaced to a public visitor as a scary badge.
 */
export function VerifiedRecordBadge({ fixtureId }: { fixtureId: string }) {
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["fixture-verify", fixtureId],
    queryFn: () => verifyMatchEvents(fixtureId),
  });

  if (!data || !data.valid || data.events === 0) {
    return null;
  }

  const verifiedDate = new Date(data.verifiedAt).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-fit">
        <Badge className="cursor-pointer gap-1.5 border-live/40 bg-live/10 text-live" variant="outline">
          <ShieldCheck className="size-3.5" />
          Verified record
        </Badge>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-live" />
              Verified record
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 text-sm">
            <p>
              Every event in this match was recorded live and cannot be edited. Verified{" "}
              {verifiedDate}.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Events recorded</p>
                <p className="font-heading text-xl">{data.events}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Recorded by</p>
                <p className="text-sm font-medium">
                  {data.recordedBy.length > 0 ? data.recordedBy.join(", ") : "—"}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Every tap is hash-chained to the one before it — changing or deleting a past event
              would break the chain and this badge would disappear.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
