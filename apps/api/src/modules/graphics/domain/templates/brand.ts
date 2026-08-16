// Default palette/type ported from apps/mobile/src/theme/floodlight.ts —
// the platform's own public-facing brand identity — so a competition that
// hasn't configured custom colours still renders something that looks like
// 4everfootball rather than a blank template.
export const FLOODLIGHT = {
  bg: '#0d0812',
  surface: '#1a1024',
  surfaceElevated: '#241531',
  ink: '#f4eff9',
  inkDim: '#b6a6c8',
  brand: '#a238ff',
  brandInk: '#ffffff',
  live: '#35d07f',
  danger: '#ff5470',
  yellow: '#f2c94c',
} as const;

// Font family names as registered with Satori's `fonts` option — see
// SatoriRendererService. Weights match the single cut of each face already
// bundled for apps/mobile (Big Shoulders Display 900, IBM Plex Sans
// 400/600, IBM Plex Mono 600) — there's no reason to ship more cuts than
// the templates actually use.
export const FONT = {
  display: 'Display',
  body: 'Body',
  bodySemibold: 'BodySemibold',
  mono: 'Mono',
} as const;

export interface CompetitionBranding {
  primaryColor: string | null;
  secondaryColor: string | null;
  sponsorLogoUrl: string | null;
  logoUrl: string | null;
  name: string;
}

export interface ResolvedBranding {
  primaryColor: string;
  secondaryColor: string;
  sponsorLogoUrl: string | null;
  logoUrl: string | null;
  name: string;
}

// "Competition branding ... is configurable per competition and applied
// automatically" (brief §4) — this is the "applied automatically" part:
// every template calls this once instead of each re-implementing the
// same null-coalescing fallback.
export function resolveBranding(
  competition: CompetitionBranding | null,
): ResolvedBranding {
  return {
    primaryColor: competition?.primaryColor ?? FLOODLIGHT.brand,
    secondaryColor: competition?.secondaryColor ?? FLOODLIGHT.bg,
    sponsorLogoUrl: competition?.sponsorLogoUrl ?? null,
    logoUrl: competition?.logoUrl ?? null,
    name: competition?.name ?? '4everfootball',
  };
}
