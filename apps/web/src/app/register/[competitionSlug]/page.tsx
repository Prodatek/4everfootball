import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PLAYER_REGISTRATION } from "@4ef/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { EntityImage } from "@/components/media/entity-image";
import { Money } from "@/components/monetisation/money";
import type { CompetitionWithLicence } from "@/features/competitions/api";

// This page's whole reason to be a Server Component (every other page in
// this app is client-rendered): brief §5 B1 — "this page is shared in
// WhatsApp groups, so its link preview matters." WhatsApp's crawler
// doesn't execute JS, so a client-fetched page would preview as empty.
async function fetchCompetition(slug: string): Promise<CompetitionWithLicence | null> {
  const base = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL;
  const res = await fetch(`${base}/competitions/${slug}`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitionSlug: string }>;
}): Promise<Metadata> {
  const { competitionSlug } = await params;
  const competition = await fetchCompetition(competitionSlug);

  if (!competition) return {};

  const description = `Register your club for ${competition.name} — ${competition.season}. ${formatFee()} per player.`;

  return {
    title: `Register for ${competition.name}`,
    description,
    openGraph: {
      title: `Register for ${competition.name}`,
      description,
      images: competition.logoUrl ? [competition.logoUrl] : [],
    },
  };
}

function formatFee(): string {
  const naira = PLAYER_REGISTRATION.STANDARD.priceKobo / 100;
  return `₦${naira.toLocaleString("en-NG")}`;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function RegisterLandingPage({
  params,
}: {
  params: Promise<{ competitionSlug: string }>;
}) {
  const { competitionSlug } = await params;
  const competition = await fetchCompetition(competitionSlug);

  if (!competition) {
    notFound();
  }

  const opensAt = formatDate(competition.registrationOpensAt);
  const closesAt = formatDate(competition.registrationClosesAt);

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-6 py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <EntityImage
          src={competition.logoUrl}
          alt={competition.name}
          fallback="competition"
          className="size-20"
        />
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl uppercase">{competition.name}</h1>
          <p className="text-muted-foreground">{competition.season}</p>
        </div>
      </div>

      {(opensAt || closesAt) && (
        <p className="text-center text-sm text-muted-foreground">
          Registration {opensAt && `opens ${opensAt}`}
          {opensAt && closesAt && " · "}
          {closesAt && `closes ${closesAt}`}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What it costs</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Per player</p>
          <p className="font-heading text-2xl">
            <Money kobo={PLAYER_REGISTRATION.STANDARD.priceKobo} />
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What you&apos;ll need</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>· Each player&apos;s full name and date of birth</li>
            <li>· A photo of each player (you can take these with your phone as you go)</li>
            <li>· A parent or guardian&apos;s contact details for any player under 18</li>
          </ul>
        </CardContent>
      </Card>

      <Button
        size="lg"
        render={<Link href={`/register/${competitionSlug}/start`} />}
        className="w-full"
      >
        Start registration
      </Button>
    </Container>
  );
}
