import { FREE_TIER_MAX_COMPETITIONS, FREE_TIER_MAX_TEAMS } from '@4ef/shared';

// The brief's §3.3 gating rules as pure, testable functions — kept separate
// from OrganisationsService the same way score-deriver.ts and
// event-hash-chain.ts were kept separate from their services in Phase 1.

export type EntitlementFeature =
  | 'PLAYER_VERIFICATION'
  | 'DATA_EXPORT'
  | 'HISTORICAL_DOWNLOADS'
  | 'SPONSOR_REPORTING'
  | 'MULTI_ADMIN'
  | 'API_ACCESS';

// "Never gate: the public fan view — live scores, fixtures, tables, player
// pages. That is distribution, not product." Deliberately not in
// EntitlementFeature at all — there's nothing to check because nothing
// calls can() for those routes; they stay @Public() exactly as before.
// "Always gate": the six features above are the complete list from §3.3.

/**
 * A COMMUNITY-tier (free/unpaid) competition is the only one an
 * organisation is limited on — LEAGUE/CHAMPIONSHIP/FEDERATION tiers imply a
 * licence was paid for, which is its own gate (licenceStatus), not a count
 * limit. "One competition per organisation, maximum 8 teams. Enough to
 * taste, too small for a real competition."
 */
export function canCreateCommunityCompetition(
  existingOpenCommunityCount: number,
): boolean {
  return existingOpenCommunityCount < FREE_TIER_MAX_COMPETITIONS;
}

export interface TeamLimitCheck {
  withinLimit: boolean;
  /** True when maxTeams is set and would be exceeded — never a hard block, always an upgrade prompt. */
  needsUpgrade: boolean;
}

/**
 * "Adding teams beyond max_teams triggers an upgrade quote rather than a
 * hard block — never let a customer hit a wall mid-season with money in
 * hand." A competition with no maxTeams set (grandfathered/unlimited
 * competitions — see the Phase 2 migration's backfill) is never gated here.
 */
export function checkTeamLimit(
  currentTeamCount: number,
  maxTeams: number | null,
): TeamLimitCheck {
  if (maxTeams === null) {
    return { withinLimit: true, needsUpgrade: false };
  }

  const withinLimit = currentTeamCount < maxTeams;
  return { withinLimit, needsUpgrade: !withinLimit };
}

/**
 * A COMMUNITY-tier competition on the free tier is additionally capped at
 * FREE_TIER_MAX_TEAMS regardless of what maxTeams is set to — the tier
 * itself carries this ceiling, not a per-competition override.
 */
export function effectiveMaxTeams(
  tier: string,
  maxTeams: number | null,
): number | null {
  if (tier === 'COMMUNITY') {
    return maxTeams === null
      ? FREE_TIER_MAX_TEAMS
      : Math.min(maxTeams, FREE_TIER_MAX_TEAMS);
  }
  return maxTeams;
}

/**
 * can(feature) — the single entitlement helper the brief asks for ("No
 * scattered if (tier === ...) checks"). Licensing status is the gate for
 * every "always gate" feature: a competition that has actually paid for a
 * licence (LICENSED/ACTIVE) gets all of them; DRAFT/AWAITING_DEPOSIT/
 * CLOSED/SUSPENDED don't. All six features share one rule today — if that
 * ever diverges (e.g. API_ACCESS needing a higher tier specifically), this
 * is the one place to add that branch, not a new scattered check.
 */
export function canForLicenceStatus(
  _feature: EntitlementFeature,
  licenceStatus: string,
): boolean {
  return licenceStatus === 'LICENSED' || licenceStatus === 'ACTIVE';
}
