/**
 * The seeded "Legacy / Unassigned" organisation every pre-Phase-2 record
 * was backfilled onto (see apps/api/prisma/migrations/2_organisations_and_money).
 * Fixed rather than looked-up so both the migration SQL and application
 * code agree on the same id without a runtime query.
 */
export const LEGACY_ORGANISATION_ID = "00000000-0000-0000-0000-000000000002";
