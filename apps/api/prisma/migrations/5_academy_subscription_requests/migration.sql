-- Phase F fix (reported directly by the user): AcademySubscriptionsService
-- used to create an AcademySubscription the instant a plan was chosen, with
-- no payment step at all. This table tracks the gap between "an organiser
-- chose a plan" (an invoice + one of these rows) and "we've actually been
-- paid" (the AcademySubscription itself, only created by
-- AcademySubscriptionsService.confirmAndActivate() once a platform admin
-- confirms the invoice is paid).

CREATE TABLE "academy_subscription_requests" (
  "id" TEXT PRIMARY KEY,
  "organisationId" TEXT NOT NULL,
  "planKey" "AcademyPlanKey" NOT NULL,
  "prepay" BOOLEAN NOT NULL,
  "invoiceId" TEXT NOT NULL UNIQUE,
  "activatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "academy_subscription_requests_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "academy_subscription_requests_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "academy_subscription_requests_organisationId_idx" ON "academy_subscription_requests"("organisationId");
