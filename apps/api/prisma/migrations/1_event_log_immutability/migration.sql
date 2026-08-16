-- Phase 1 (MONETISATION_BUILD_BRIEF.md): harden match_events into an
-- append-only, tamper-evident log. Ordering matters in this file — columns
-- are added nullable, data is backfilled, THEN constraints are tightened and
-- the immutability trigger is created last, so the backfill itself is never
-- blocked by the trigger it's about to install.

-- 1. New enum values (correction mechanism).
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'CORRECTION';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'NOTE';

-- 2. New columns, all nullable for now so existing rows aren't broken.
ALTER TABLE "match_events"
  ADD COLUMN "correctsEventId"  TEXT,
  ADD COLUMN "correctionReason" TEXT,
  ADD COLUMN "prevHash"         TEXT,
  ADD COLUMN "hash"             TEXT;

-- 3. Seed a well-known system user for events with no human recorder (today:
-- only AutoKickoffService's auto-generated KICKOFF events). Fixed UUID so
-- application code can reference it as a constant rather than a lookup.
-- Password hash is an unusable placeholder (bcrypt can never produce this
-- string) — this account has no password-based login path and isn't gated
-- behind one; it exists purely as a foreign-key target for attribution.
INSERT INTO "users" ("id", "email", "passwordHash", "displayName", "roles", "isActive")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'system@4everfootball.internal',
  'unusable:system-account-no-login',
  'System',
  ARRAY['SUPER_ADMIN']::"Role"[],
  false
)
ON CONFLICT ("id") DO NOTHING;

-- 4. Backfill existing rows.
--    recordedById: any pre-Phase-1 row with no recorder (there shouldn't be
--    many — this table has only had light manual/test traffic so far) is
--    attributed to the system account rather than left null.
UPDATE "match_events" SET "recordedById" = '00000000-0000-0000-0000-000000000001'
WHERE "recordedById" IS NULL;

--    prevHash/hash: pre-Phase-1 rows were never captured under the hash-chain
--    discipline — several of the fields the hash covers (correctsEventId,
--    correctionReason) didn't exist as concepts yet, so computing a
--    retroactive "real" hash for them would be synthetic, not a genuine
--    chain. They're marked with an explicit sentinel instead of a fabricated
--    value. GET /fixtures/:id/verify treats any 'legacy:unchained' hash as
--    unverifiable rather than silently reporting it valid — see
--    MatchEventsService.verifyChain().
UPDATE "match_events" SET "prevHash" = 'legacy:unchained', "hash" = 'legacy:unchained'
WHERE "hash" IS NULL;

-- 5. Now safe to tighten constraints.
ALTER TABLE "match_events"
  ALTER COLUMN "recordedById" SET NOT NULL,
  ALTER COLUMN "prevHash" SET NOT NULL,
  ALTER COLUMN "hash" SET NOT NULL;

-- 6. Foreign keys for the new relations.
ALTER TABLE "match_events"
  DROP CONSTRAINT IF EXISTS "match_events_recordedById_fkey";
ALTER TABLE "match_events"
  ADD CONSTRAINT "match_events_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "match_events"
  ADD CONSTRAINT "match_events_correctsEventId_fkey"
  FOREIGN KEY ("correctsEventId") REFERENCES "match_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "match_events_correctsEventId_idx" ON "match_events"("correctsEventId");

-- 7. Fixture -> MatchEvent: Cascade to Restrict. A fixture with recorded
-- events can no longer be deleted as a side effect of destroying its log.
ALTER TABLE "match_events"
  DROP CONSTRAINT IF EXISTS "match_events_fixtureId_fkey";
ALTER TABLE "match_events"
  ADD CONSTRAINT "match_events_fixtureId_fkey"
  FOREIGN KEY ("fixtureId") REFERENCES "fixtures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 8. The actual guarantee: reject UPDATE and DELETE on match_events at the
-- database level, unconditionally — not scoped to the application's
-- Postgres role, so this can't be bypassed by connecting as a different
-- role, only by a superuser explicitly dropping the trigger first (a loud,
-- deliberate, logged action, not a quiet UPDATE). This is what makes the
-- guarantee real instead of application-layer convention — see the Phase 0
-- report's finding that every existing "no update/delete" rule was
-- previously enforced by nothing but a service method choosing not to call
-- .update().
CREATE OR REPLACE FUNCTION reject_match_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'match_events is append-only: % is not permitted (id=%)',
    TG_OP,
    COALESCE(OLD."id", 'unknown');
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS match_events_no_update ON "match_events";
CREATE TRIGGER match_events_no_update
  BEFORE UPDATE ON "match_events"
  FOR EACH ROW
  EXECUTE FUNCTION reject_match_event_mutation();

DROP TRIGGER IF EXISTS match_events_no_delete ON "match_events";
CREATE TRIGGER match_events_no_delete
  BEFORE DELETE ON "match_events"
  FOR EACH ROW
  EXECUTE FUNCTION reject_match_event_mutation();
