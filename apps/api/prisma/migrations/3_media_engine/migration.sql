-- Phase 3 (MONETISATION_BUILD_BRIEF.md §4): the media engine. All new
-- columns/tables — no backfill needed since nothing existing depends on
-- graphics or media-pack entitlements.

-- 1. Competition branding — nullable, unset competitions fall back to the
-- platform's own Floodlight palette at render time (see GraphicsModule).
ALTER TABLE "competitions"
  ADD COLUMN "primaryColor" TEXT,
  ADD COLUMN "secondaryColor" TEXT,
  ADD COLUMN "sponsorLogoUrl" TEXT;

-- 2. New enums.
CREATE TYPE "GraphicTemplate" AS ENUM (
  'FULL_TIME_RESULT', 'GOAL_ALERT', 'MATCHDAY_FIXTURES', 'LEAGUE_TABLE',
  'TOP_SCORERS', 'PLAYER_OF_WEEK', 'PLAYER_PASSPORT', 'HEAD_TO_HEAD',
  'MILESTONE', 'SEASON_SUMMARY'
);
CREATE TYPE "GraphicFormat" AS ENUM ('SQUARE', 'PORTRAIT', 'STORY');
CREATE TYPE "GraphicStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- 3. graphics — one row per rendered image across all 10 templates; see the
-- schema comment on the Graphic model for why this is one polymorphic table
-- rather than ten.
CREATE TABLE "graphics" (
  "id" TEXT PRIMARY KEY,
  "template" "GraphicTemplate" NOT NULL,
  "format" "GraphicFormat" NOT NULL,
  "status" "GraphicStatus" NOT NULL DEFAULT 'PENDING',
  "competitionId" TEXT,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "mediaKey" TEXT,
  "publicUrl" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readyAt" TIMESTAMP(3),
  CONSTRAINT "graphics_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "graphics_status_idx" ON "graphics"("status");
CREATE INDEX "graphics_subjectType_subjectId_idx" ON "graphics"("subjectType", "subjectId");
CREATE INDEX "graphics_competitionId_idx" ON "graphics"("competitionId");

-- 4. media_pack_entitlements — see the schema comment on
-- MediaPackEntitlement for the competitionId-null-vs-set meaning.
CREATE TABLE "media_pack_entitlements" (
  "id" TEXT PRIMARY KEY,
  "organisationId" TEXT NOT NULL,
  "competitionId" TEXT,
  "sourcePaymentId" TEXT NOT NULL UNIQUE,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "media_pack_entitlements_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "media_pack_entitlements_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "media_pack_entitlements_sourcePaymentId_fkey" FOREIGN KEY ("sourcePaymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "media_pack_entitlements_organisationId_idx" ON "media_pack_entitlements"("organisationId");
