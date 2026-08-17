-- Phase 4 (MONETISATION_BUILD_BRIEF.md §5): sponsor reporting + academy
-- workspace. All new columns are nullable-or-defaulted and no backfill is
-- needed — nothing existing depends on any of this data.

-- 1. organisation_members: COACH role.
ALTER TYPE "OrganisationMemberRole" ADD VALUE 'COACH';

-- 2. teams: community (sponsor-dashboard metric) + ageGroupId (added after
-- academy_age_groups exists below, see step 8).
ALTER TABLE "teams" ADD COLUMN "community" TEXT;

-- 3. players: gender.
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');
ALTER TABLE "players" ADD COLUMN "gender" "Gender";

-- 4. competitions: page view counter.
ALTER TABLE "competitions" ADD COLUMN "pageViewCount" INTEGER NOT NULL DEFAULT 0;

-- 5. fixtures: attendance + cached chain-verification result.
ALTER TABLE "fixtures"
  ADD COLUMN "attendanceCount" INTEGER,
  ADD COLUMN "chainVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "verifiedAt" TIMESTAMP(3);

-- 6. graphics: share counter.
ALTER TABLE "graphics" ADD COLUMN "shareCount" INTEGER NOT NULL DEFAULT 0;

-- 7. player_outcomes.
CREATE TYPE "PlayerOutcomeType" AS ENUM ('TRIAL', 'CALL_UP', 'SIGNING');
CREATE TABLE "player_outcomes" (
  "id" TEXT PRIMARY KEY,
  "playerId" TEXT NOT NULL,
  "type" "PlayerOutcomeType" NOT NULL,
  "description" TEXT NOT NULL,
  "sourceNote" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "player_outcomes_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "player_outcomes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "player_outcomes_playerId_idx" ON "player_outcomes"("playerId");

-- 8. academy_age_groups (created before teams.ageGroupId's FK, and before
-- academy_attendance/academy_subscriptions which reference it).
CREATE TABLE "academy_age_groups" (
  "id" TEXT PRIMARY KEY,
  "organisationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "minAge" INTEGER,
  "maxAge" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "academy_age_groups_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "academy_age_groups_organisationId_name_key" ON "academy_age_groups"("organisationId", "name");

ALTER TABLE "teams" ADD COLUMN "ageGroupId" TEXT;
ALTER TABLE "teams"
  ADD CONSTRAINT "teams_ageGroupId_fkey"
  FOREIGN KEY ("ageGroupId") REFERENCES "academy_age_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "teams_ageGroupId_idx" ON "teams"("ageGroupId");

-- 9. sponsor_entitlements — admin-granted, no checkout (see the schema
-- comment on SponsorEntitlement for why there's no sourcePayment FK here).
CREATE TYPE "SponsorFeature" AS ENUM ('IMPACT_REPORT');
CREATE TABLE "sponsor_entitlements" (
  "id" TEXT PRIMARY KEY,
  "organisationId" TEXT NOT NULL,
  "competitionId" TEXT,
  "feature" "SponsorFeature" NOT NULL,
  "grantedById" TEXT NOT NULL,
  "note" TEXT,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sponsor_entitlements_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sponsor_entitlements_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sponsor_entitlements_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "sponsor_entitlements_organisationId_idx" ON "sponsor_entitlements"("organisationId");

-- 10. academy_attendance — same clientEventId offline-sync idempotency
-- pattern as match_events; see the schema comment on AcademyAttendance.
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');
CREATE TABLE "academy_attendance" (
  "id" TEXT PRIMARY KEY,
  "organisationId" TEXT NOT NULL,
  "ageGroupId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "status" "AttendanceStatus" NOT NULL,
  "recordedById" TEXT NOT NULL,
  "clientEventId" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "academy_attendance_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "academy_attendance_ageGroupId_fkey" FOREIGN KEY ("ageGroupId") REFERENCES "academy_age_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "academy_attendance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "academy_attendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "academy_attendance_ageGroupId_playerId_idx" ON "academy_attendance"("ageGroupId", "playerId");
CREATE INDEX "academy_attendance_organisationId_idx" ON "academy_attendance"("organisationId");

-- 11. academy_subscriptions — one row per year, append-only (see schema
-- comment on AcademySubscription).
CREATE TYPE "AcademyPlanKey" AS ENUM ('STARTER', 'GROWTH', 'ELITE');
CREATE TABLE "academy_subscriptions" (
  "id" TEXT PRIMARY KEY,
  "organisationId" TEXT NOT NULL,
  "planKey" "AcademyPlanKey" NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "invoiceId" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "academy_subscriptions_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "academy_subscriptions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "academy_subscriptions_organisationId_idx" ON "academy_subscriptions"("organisationId");
