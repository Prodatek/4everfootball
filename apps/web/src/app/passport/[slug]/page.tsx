import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Player } from "@4ef/shared";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/layout/container";
import { PassportPoller } from "@/features/graphics/passport-poller";
import { PassportShareBar } from "@/features/graphics/passport-share-bar";
import type { Graphic } from "@/features/graphics/api";

// §5 G2: "the acquisition loop — it must look genuinely good, load fast,
// and share cleanly. Get the link preview metadata right." Second Server
// Component page in the app (the first, register/[competitionSlug], exists
// for the identical reason: WhatsApp/Instagram's crawlers don't execute
// client JS, so real SSR is the only way the shared link previews well.
function apiBase(): string {
  return process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";
}

async function fetchPlayer(slug: string): Promise<Player | null> {
  const res = await fetch(`${apiBase()}/players/${slug}`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json();
}

async function fetchOrCreatePassport(playerId: string): Promise<Graphic | null> {
  const res = await fetch(`${apiBase()}/players/${playerId}/passport`, {
    method: "POST",
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const player = await fetchPlayer(slug);
  if (!player) return {};

  const passport = await fetchOrCreatePassport(player.id);
  const title = `${player.firstName} ${player.lastName} — Player Passport`;
  const description = `${player.firstName} ${player.lastName}'s verified player passport on 4everfootball.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: passport?.publicUrl ? [passport.publicUrl] : [],
    },
  };
}

export default async function PlayerPassportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const player = await fetchPlayer(slug);

  if (!player) {
    notFound();
  }

  const passport = await fetchOrCreatePassport(player.id);
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/passport/${slug}`;

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-6 py-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-heading text-2xl uppercase">
          {player.firstName} {player.lastName}
        </h1>
        {passport?.status === "READY" && (
          <Badge variant="outline" className="gap-1 border-live/40 bg-live/10 text-live">
            Verified passport
          </Badge>
        )}
      </div>

      {(!passport || passport.status === "PENDING" || passport.status === "PROCESSING") && (
        <>
          <div className="flex aspect-[9/16] w-full max-w-sm mx-auto flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted">
            <p className="text-sm text-muted-foreground">Generating passport...</p>
          </div>
          <PassportPoller />
        </>
      )}

      {passport?.status === "FAILED" && (
        <div className="flex aspect-[9/16] w-full max-w-sm mx-auto flex-col items-center justify-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10">
          <p className="text-sm text-destructive">Couldn&apos;t generate this passport. Try again shortly.</p>
        </div>
      )}

      {passport?.status === "READY" && passport.publicUrl && (
        <>
          <div className="relative mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- dynamic, externally-hosted generated graphic */}
            <img
              src={passport.publicUrl}
              alt={`${player.firstName} ${player.lastName}'s player passport`}
              className="size-full object-cover"
            />
          </div>
          <div className="mx-auto w-full max-w-sm">
            <PassportShareBar
              graphicId={passport.id}
              playerName={`${player.firstName} ${player.lastName}`}
              shareUrl={shareUrl}
            />
          </div>
        </>
      )}
    </Container>
  );
}
