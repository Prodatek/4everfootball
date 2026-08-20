import { ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// §5 E2: "Every number carries its verification status. Anything estimated
// is visibly labelled as an estimate with its basis shown — that honesty
// is the product." Basis is rendered as plain visible text, never a
// hover-only tooltip, since a sponsor reading a downloaded report has no
// hover.
export function VerificationTag({
  kind,
  basis,
}: {
  kind: "verified" | "estimated";
  basis?: string;
}) {
  if (kind === "verified") {
    return (
      <div className="flex flex-col gap-0.5">
        <Badge variant="outline" className="w-fit gap-1 border-live/40 bg-live/10 text-live">
          <ShieldCheck className="size-3" />
          Verified
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <Badge variant="outline" className="w-fit gap-1 text-muted-foreground">
        <TriangleAlert className="size-3" />
        Estimated
      </Badge>
      {basis && <p className="text-xs text-muted-foreground">{basis}</p>}
    </div>
  );
}
