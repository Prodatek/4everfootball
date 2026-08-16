-- Phase 2 (MONETISATION_BUILD_BRIEF.md): organisations/tenancy + the money
-- path. Same ordering discipline as migration 1: new columns land nullable,
-- get backfilled, THEN constraints tighten — so the backfill step is never
-- fighting a constraint it's about to satisfy.

-- 1. New enums.
CREATE TYPE "OrganisationType" AS ENUM ('ORGANISER', 'ACADEMY', 'SCHOOL_LEAGUE', 'FEDERATION', 'CLUB');
CREATE TYPE "OrganisationMemberRole" AS ENUM ('OWNER', 'ADMIN', 'RECORDER', 'VIEWER');
CREATE TYPE "CompetitionTier" AS ENUM ('COMMUNITY', 'LEAGUE', 'CHAMPIONSHIP', 'FEDERATION');
CREATE TYPE "LicenceStatus" AS ENUM ('DRAFT', 'AWAITING_DEPOSIT', 'LICENSED', 'ACTIVE', 'CLOSED', 'SUSPENDED');
CREATE TYPE "RegistrationStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'CONFIRMED', 'LOCKED');
CREATE TYPE "PaymentProvider" AS ENUM ('PAYSTACK', 'BANK_TRANSFER', 'CASH');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'ABANDONED');
CREATE TYPE "PaymentPurpose" AS ENUM ('LICENCE', 'ONBOARDING', 'PLAYER_REGISTRATION', 'ACADEMY_PLAN', 'ADD_ON');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PART_PAID', 'PAID', 'CANCELLED', 'EXPIRED');

-- 2. organisations / organisation_members.
CREATE TABLE "organisations" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" "OrganisationType" NOT NULL,
  "contactName" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "rcNumber" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "organisation_members" (
  "id" TEXT PRIMARY KEY,
  "organisationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "OrganisationMemberRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organisation_members_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "organisation_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "organisation_members_organisationId_userId_key" ON "organisation_members"("organisationId", "userId");
CREATE INDEX "organisation_members_userId_idx" ON "organisation_members"("userId");

-- 3. Seed a "legacy" organisation for every competition that already exists
-- — fixed, well-known UUID (matches the SYSTEM_USER_ID pattern from
-- migration 1) so application code can reference it as a constant.
INSERT INTO "organisations" ("id", "name", "type", "email", "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Legacy / Unassigned',
  'ORGANISER',
  'ops@4everfootball.internal',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

-- Every current SUPER_ADMIN/ADMIN becomes an OWNER of the legacy org, so
-- nobody loses the ability to manage the competitions they already manage —
-- tenancy is additive here, not a permissions regression.
INSERT INTO "organisation_members" ("id", "organisationId", "userId", "role", "createdAt")
SELECT gen_random_uuid()::text, '00000000-0000-0000-0000-000000000002', "id", 'OWNER', CURRENT_TIMESTAMP
FROM "users"
WHERE 'SUPER_ADMIN' = ANY("roles") OR 'ADMIN' = ANY("roles")
ON CONFLICT ("organisationId", "userId") DO NOTHING;

-- 4. competitions: organisationId + licensing fields.
ALTER TABLE "competitions"
  ADD COLUMN "organisationId" TEXT,
  ADD COLUMN "tier" "CompetitionTier" NOT NULL DEFAULT 'COMMUNITY',
  ADD COLUMN "licenceStatus" "LicenceStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "licensedUntil" TIMESTAMP(3),
  ADD COLUMN "maxTeams" INTEGER,
  ADD COLUMN "registrationFeeKobo" INTEGER,
  ADD COLUMN "registrationOpensAt" TIMESTAMP(3),
  ADD COLUMN "registrationClosesAt" TIMESTAMP(3);

-- Backfill: every existing competition -> legacy org, and grandfathered as
-- already-licensed/unlimited (see the schema comment on Competition.tier —
-- these are real, already-public competitions that never agreed to limits
-- that didn't exist when they were created).
UPDATE "competitions"
SET "organisationId" = '00000000-0000-0000-0000-000000000002',
    "tier" = 'FEDERATION',
    "licenceStatus" = 'ACTIVE'
WHERE "organisationId" IS NULL;

ALTER TABLE "competitions" ALTER COLUMN "organisationId" SET NOT NULL;
ALTER TABLE "competitions"
  ADD CONSTRAINT "competitions_organisationId_fkey"
  FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "competitions_organisationId_idx" ON "competitions"("organisationId");

-- 5. teams: organisationId, nullable, NOT backfilled — see the schema
-- comment on Team.organisationId. Every team that exists today was
-- admin-created, not club-self-registered; it stays unlinked until a club
-- account claims it through the new registration flow.
ALTER TABLE "teams" ADD COLUMN "organisationId" TEXT;
ALTER TABLE "teams"
  ADD CONSTRAINT "teams_organisationId_fkey"
  FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "teams_organisationId_idx" ON "teams"("organisationId");

-- 6. player_registrations.
CREATE TABLE "player_registrations" (
  "id" TEXT PRIMARY KEY,
  "competitionId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "status" "RegistrationStatus" NOT NULL DEFAULT 'DRAFT',
  "priceKobo" INTEGER NOT NULL,
  "paymentId" TEXT,
  "guardianName" TEXT,
  "guardianPhone" TEXT,
  "guardianEmail" TEXT,
  "guardianConsentAt" TIMESTAMP(3),
  "lockedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "player_registrations_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "player_registrations_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "player_registrations_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "player_registrations_competitionId_playerId_key" ON "player_registrations"("competitionId", "playerId");
CREATE INDEX "player_registrations_teamId_idx" ON "player_registrations"("teamId");
CREATE INDEX "player_registrations_paymentId_idx" ON "player_registrations"("paymentId");

-- 7. payments (created before player_registrations' paymentId FK is added,
-- so the FK target exists — see step 8).
CREATE TABLE "payments" (
  "id" TEXT PRIMARY KEY,
  "organisationId" TEXT NOT NULL,
  "reference" TEXT NOT NULL UNIQUE,
  "provider" "PaymentProvider" NOT NULL,
  "providerReference" TEXT,
  "amountKobo" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "purpose" "PaymentPurpose" NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "paidAt" TIMESTAMP(3),
  "rawResponse" JSONB,
  "confirmedById" TEXT,
  "transferProofUrl" TEXT,
  "transferNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payments_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payments_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "payments_organisationId_idx" ON "payments"("organisationId");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_subjectType_subjectId_idx" ON "payments"("subjectType", "subjectId");

-- 8. Now that payments exists, wire player_registrations.paymentId to it.
ALTER TABLE "player_registrations"
  ADD CONSTRAINT "player_registrations_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 9. webhook_events — every payload stored raw before processing, see the
-- schema comment on WebhookEvent.
CREATE TABLE "webhook_events" (
  "id" TEXT PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "providerReference" TEXT,
  "signatureValid" BOOLEAN NOT NULL,
  "rawBody" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3),
  "processingError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "webhook_events_provider_providerReference_idx" ON "webhook_events"("provider", "providerReference");

-- 10. Sequential human-readable quote numbers (4EV-2026-0001) — a real
-- Postgres sequence rather than a max()+1 query, so two concurrent quote
-- creations can never collide. InvoicesService formats the prefix/year
-- around whatever nextval() returns.
CREATE SEQUENCE "invoice_quote_seq" START 1;

CREATE TABLE "invoices" (
  "id" TEXT PRIMARY KEY,
  "organisationId" TEXT NOT NULL,
  "quoteNumber" TEXT NOT NULL UNIQUE,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "subtotalKobo" INTEGER NOT NULL,
  "discountKobo" INTEGER NOT NULL DEFAULT 0,
  "totalKobo" INTEGER NOT NULL,
  "validUntil" TIMESTAMP(3),
  "depositKobo" INTEGER,
  "balanceKobo" INTEGER,
  "issuedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "invoices_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "invoices_organisationId_idx" ON "invoices"("organisationId");

CREATE TABLE "invoice_lines" (
  "id" TEXT PRIMARY KEY,
  "invoiceId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "basis" TEXT,
  "quantity" INTEGER NOT NULL,
  "unitKobo" INTEGER NOT NULL,
  "amountKobo" INTEGER NOT NULL,
  CONSTRAINT "invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "invoice_lines_invoiceId_idx" ON "invoice_lines"("invoiceId");
