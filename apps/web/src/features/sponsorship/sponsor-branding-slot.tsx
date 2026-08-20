// §5 E3: "Additive only. A defined slot that renders sponsor logos when
// configured and renders nothing at all when not. Zero visual change to
// competitions without a sponsor." Same null-when-absent shape as C3's
// VerifiedRecordBadge — this is the brief's second and last permitted
// additive change to an existing page (§6).
export function SponsorBrandingSlot({
  sponsorLogoUrl,
}: {
  sponsorLogoUrl: string | null | undefined;
}) {
  if (!sponsorLogoUrl) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
      <span>In partnership with</span>
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic, externally-hosted sponsor logo */}
      <img src={sponsorLogoUrl} alt="Sponsor" className="h-6 w-auto object-contain" />
    </div>
  );
}
