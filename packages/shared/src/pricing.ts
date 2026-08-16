// Single source of truth for every price in the product (brief §3.2/§6:
// "Never write a price literal anywhere else in the codebase"). Amounts are
// integer kobo (₦1 = 100 kobo) — never a float, never a decimal string.
// Lives in packages/shared rather than apps/api/src/config (where the brief
// puts it) because it's plain data + a pure formatter with zero framework
// dependency, exactly like every other cross-cutting constant in this
// package (Role, MatchEventType, FixtureStatus) — apps/api/src/config/
// pricing.ts re-exports this for anyone looking for it at the brief's exact
// path. The API is still the only place that ever RECOMPUTES an amount
// server-side before a charge — this file being importable from web/mobile
// later is for display only, never for client-supplied pricing.
export const CURRENCY = "NGN" as const;

export const COMPETITION_TIERS = {
  COMMUNITY: { label: "Community Cup", maxTeams: 16, minTeams: 0, priceKobo: 7_500_000 },
  LEAGUE: { label: "League", maxTeams: 48, minTeams: 17, priceKobo: 20_000_000 },
  CHAMPIONSHIP: { label: "Championship", maxTeams: 120, minTeams: 49, priceKobo: 45_000_000 },
  FEDERATION: { label: "Federation / State", maxTeams: null, minTeams: 121, priceKobo: 120_000_000 },
} as const;

export type CompetitionTierKey = keyof typeof COMPETITION_TIERS;

export const ONBOARDING_FEE_KOBO = 5_000_000; // ₦50,000, waived on full prepay

export const PLAYER_REGISTRATION = {
  STANDARD: { priceKobo: 100_000 }, // ₦1,000
  PASSPORT: { priceKobo: 250_000 }, // ₦2,500
  VOLUME: { priceKobo: 70_000, minPlayers: 3000 }, // ₦700
  CARRY_OVER: { priceKobo: 40_000 }, // ₦400
} as const;

export type PlayerRegistrationTierKey = keyof typeof PLAYER_REGISTRATION;

export const ACADEMY_PLANS = {
  STARTER: { maxPlayers: 30, priceKobo: 4_500_000 },
  GROWTH: { maxPlayers: 100, priceKobo: 12_000_000 },
  ELITE: { maxPlayers: 300, priceKobo: 30_000_000 },
} as const;

export const ADD_ONS = {
  DEV_REPORT_TERM: { priceKobo: 2_500_000 },
  SPONSOR_DASHBOARD: { priceKobo: 15_000_000 },
  IMPACT_REPORT: { priceKobo: 25_000_000 },
  SPONSOR_BUNDLE: { priceKobo: 35_000_000 },
  MEDIA_PACK_PER_CLUB: { priceKobo: 1_500_000 },
  MEDIA_PACK_COMPETITION: { priceKobo: 25_000_000 },
} as const;

export const ANNUAL_PREPAY_DISCOUNT = 0.2;

// Free tier limits (§3.3) — not a priced tier, but part of the same "what
// can an organisation have without paying" configuration.
export const FREE_TIER_MAX_COMPETITIONS = 1;
export const FREE_TIER_MAX_TEAMS = 8;

/**
 * The only way money reaches the UI (brief §3.2/§6). No `toFixed(2)` on
 * money anywhere else, no floats — this takes an integer kobo amount and
 * does the division/formatting once, here.
 */
export function formatNaira(kobo: number): string {
  if (!Number.isInteger(kobo)) {
    throw new Error(`formatNaira received a non-integer kobo amount: ${kobo}`);
  }

  const naira = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: kobo % 100 === 0 ? 0 : 2,
  }).format(naira);
}
