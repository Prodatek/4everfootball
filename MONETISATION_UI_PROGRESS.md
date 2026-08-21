# Monetisation UI — Progress

Running log per `MONETISATION_UI_BRIEF.md` §8.5. Newest entries first.

---

## Post-Phase-B fix — Standalone team-claim flow

**Reported directly by the user.** `claimTeam()` was called from exactly one place in the whole codebase: inside a *specific competition's* registration wizard (`/register/[slug]/start`, step 3 of "Account → Club → Team"). A club/school/academy had no way to claim their team ahead of time, independent of any competition — they'd have to walk through one specific competition's wizard just to reach the claim step, even if entering that competition wasn't the actual goal yet. Confirmed by grep, not assumed: every link to `/register/[slug]/...` in the app originates from within that flow itself — nothing on the public competition page or the organiser's own dashboard links to it either, so even the organiser side of "share this link" had no way to find the URL.

**User's explicit call**: build a standalone claim flow, and keep the competition-embedded one exactly as it is — both should exist side by side.

- New `/account/club` — reachable from a new card on `/dashboard` ("Your club, school, or academy — Get started"). Create a CLUB/SCHOOL_LEAGUE/ACADEMY account, see any teams already claimed, and search+claim more — the exact same `createOrganisation()`/`fetchTeams({unclaimed:true})`/`claimTeam()` calls the embedded wizard already used, just not gated behind picking a competition first. Zero backend changes — this is purely recombining existing endpoints into a new entry point.
- **A real correctness gap this surfaced, fixed alongside it**: the embedded wizard's step logic (`/register/[slug]/start`) always showed the claim-search step once a user had a club, with no check for whether that club already owned a team. Once a team can be claimed via the new standalone route first, going through a competition's wizard afterward would search "unclaimed" teams and never find the now-claimed one — a dead end. Fixed by having the wizard check whether the org already owns a team and, if so, redirecting straight to the squad builder for it. The claim step's own UI/logic is untouched — this only changes when that step is shown, per the user's instruction to keep it as-is.
- Verified live end-to-end with a brand-new test account: registered → dashboard shows the new entry card → created a club account → claimed a real unclaimed team → then opened a real competition's registration wizard and confirmed it skipped straight past the claim step to the squad builder, rather than the dead-end it would otherwise have been.

---

## Post-Phase-F fix — Academy plan payment gate

**Reported directly by the user, not caught during Phase F's own verification.** Phase F's "Activate plan" button granted the academy subscription the instant a plan was chosen — `AcademySubscriptionsService.subscribe()` created the `AcademySubscription` and a DRAFT invoice in the same call, with no payment step in between at all. Every other money flow in this app (licence checkout, player registration, media packs) goes PENDING → paid/confirmed → *then* entitlement granted; academy plans skipped that entirely, and D2 had no visibility into academy billing at all (it only ever tracked `Payment` records, never `Invoice`/`AcademySubscription`). This was a real reliability gap, not a UI bug — flagged and fixed at the user's explicit request.

**Fix, confirmed with the user before building (required a schema migration):** decoupled "choosing a plan" from "activating it." A new `AcademySubscriptionRequest` model (`organisationId`, `planKey`, `prepay`, `invoiceId`, `activatedAt`) holds a chosen plan from the moment `subscribe()` issues its invoice (`DRAFT` → `SENT`, "awaiting payment") until a platform admin confirms it. The `AcademySubscription` row itself — the thing that actually grants the plan — is now created exclusively by a new `confirmAndActivate()` method, mirroring `PaymentsService.confirmBankTransfer()` → `fulfilPayment()`'s exact "a human confirmed real money arrived, only then grant it" shape used everywhere else. Also closed a second, smaller gap the same bug enabled: `subscribe()` now rejects a second plan choice while one is already awaiting confirmation (previously nothing stopped an org from accidentally submitting overlapping requests).

- **F5** (`.../academy/billing`) now shows three real states: no plan, awaiting confirmation (invoice details + "Download invoice PDF", no picker shown), or an active plan — never a plan that's "active" before payment.
- **D2** (`/admin/revenue`) gained a new "Academy plan requests awaiting confirmation" section — every organisation's pending choice, SUPER_ADMIN-only like every other D2 action, with one "Confirm payment & activate" button that records the invoice as paid and creates the subscription atomically.
- Verified live end-to-end: submitted a real Elite plan request (correct 20%-prepay-discounted total), confirmed the double-submit guard rejects a second request, confirmed it from D2, and watched the invoice flip to `PAID`, the subscription appear with a real one-year window, and the request disappear from D2's pending list — all in one real pass, not separately mocked steps.

**A genuinely difficult deployment, worth recording:** this was the first schema migration this session had to ship (every earlier phase's backend work fit into existing columns). The migration's own SQL ran cleanly via `prisma db execute`, but a *separate*, later `prisma migrate deploy` attempt then tried to re-create the same now-existing table and failed with "already exists," which Prisma recorded as a **failed migration** — a state that blocks every subsequent `migrate deploy` (error P3009) and, because the `api` container's own startup routine runs `migrate deploy` first, took the whole API down. Resolved via `prisma migrate resolve --applied` (telling Prisma's bookkeeping the migration is in fact applied, which it was) rather than fighting the failed-state lock. Separately hit the same stale-Docker-layer-cache issue as earlier phases, this time on the `api-migrate` service specifically (a `docker compose run` reused an image built before the new migration file existed on disk) — same fix, `--no-cache` before running it.

---

## Phase G — Media library

**Status: built and verified live end-to-end.** Research found the graphics backend already substantial — 10 graphic templates (including a fully-built, Satori-rendered Player Passport art template), a poll-based render worker, and a `GraphicsController` with list/get/WhatsApp-share/passport routes — but the list endpoints had no filtering at all, no bulk download existed anywhere in the codebase (every prior download in this app is single-file), and there was zero frontend for any of it. Verified live end-to-end against real, freshly-generated data: purchased and confirmed a media pack entitlement, recorded a real goal and full-time on a real fixture to trigger genuine `GOAL_ALERT`/`FULL_TIME_RESULT`/`LEAGUE_TABLE`/`SEASON_SUMMARY` graphics, then confirmed G1's type and club filters each correctly include/exclude the right graphics and that "Download filtered (zip)" produces a real, valid 4-file zip archive (extracted and opened — genuinely well-composed marketing graphics, not placeholders). G2 confirmed the existing player-passport pipeline end-to-end: a real `READY` passport, real server-rendered OG meta tags pointing at the real passport image (checked via raw HTML, no JS), and both share actions wired to real endpoints.

**Two real bugs found and fixed during this verification pass, both a class of bug specific to this app's Select component (Base UI, not Radix):**
1. In my own new G1 filter dropdowns, every trigger showed the literal filter value ("ALL") instead of a label. Base UI's `Select.Value` only shows a matched item's label if you pass an explicit `children` render function (`{(value) => label}`) — it does **not** auto-resolve the item's rendered children the way Radix does, which every prior Select usage in this codebase happened to never surface because their `value` and displayed label were coincidentally identical strings (e.g. an enum key shown as its own uppercase label). Fixed by adding the render-function children this component actually requires.
2. Same bug, already live in Phase F's roster page — the "Move to age group" select would have shown a raw age-group UUID once one was picked, never caught because that dropdown was never actually exercised through a full select-then-screenshot in Phase F's verification pass. Fixed the same way.
This is a wider, pre-existing pattern across several Phase 1/2 screens (e.g. `create-fixture-dialog.tsx`'s team pickers use `value={team.id}` with a name label — same bug, live before this project's monetisation phases began). Flagged, not fixed — out of scope for this brief, which forbids "refactoring... anything you were not asked to change."

### G1 · Competition media library
- `/admin/organisations/[id]/competitions/[slug]/media` — filter by type (the `template` enum), club, and match; a grid of thumbnails with status badges; "Download filtered (zip)" and a per-item download, both fetched-as-blob rather than a plain `<a download>` (which browsers largely ignore for cross-origin URLs without `Content-Disposition: attachment`, which S3/MinIO doesn't send).
- **Real architecture decision, asked and confirmed**: `Graphic` has no direct club/match column — every template's subject means something different (a fixture, a player, a match event, or the whole competition). Club/match filters are resolved as small targeted lookups per subject-type category (fixture → home/away team; player → their team; match event → its own `teamId`/`fixtureId`) rather than one giant join; competition-wide templates (league table, top scorers, ...) are correctly excluded once a club/match filter is applied, not force-fitted into one.
- **Real dependency decision, asked and confirmed**: added `archiver` for the zip stream — no zip/archive library existed anywhere in this codebase before this phase. Hit a genuine surprise mid-build: `archiver`'s latest major (v8) was rewritten as pure ESM with a different class-based API, breaking the classic `archiver('zip')` factory almost every example (including the one originally planned here) assumes. Pinned to `^7.0.1`, the last CJS-compatible major with the classic API, rather than rewriting around v8's interop — same category of fix as `pdfkit`'s existing `createRequire` workaround elsewhere in this codebase, applied here too since `archiver@7`'s CJS export has the identical "type-checks but resolves to undefined at runtime" issue without `esModuleInterop`.
- **Real scope decision, asked and confirmed**: G1 stays organiser-only (org-scoped like every other admin screen this phase), with per-club filtering the organiser uses to hand a club its own zip directly — no separate club-facing login/portal was built, since the existing graphics endpoints are all gated to the competition's own org with no club-facing auth surface to build on.
- Backend: `GraphicsService.listForCompetition()` extended with `{template, teamId, fixtureId}` filters; new `buildZipArchive()`; `S3StorageService.getObjectStream()` (the module only had upload/presign/delete before this); `GET /competitions/:competitionId/graphics/zip`. All additive — existing `listForOrganisation()`/`getById()`/WhatsApp-share/passport routes untouched.

### G2 · Player passport
- `/passport/[slug]` — the **second** Server Component page in the app (after `register/[competitionSlug]`, for the identical reason: WhatsApp/Instagram's crawlers don't run client JS, so real SSR is the only way a shared link previews correctly). Get-or-creates the passport via the existing public `POST /players/:playerId/passport` at request time; a `PassportPoller` client island silently re-fetches every 3s for the rare case a brand-new player's very first view catches the graphic still rendering.
- New `PassportShareBar` — this app's **first** use of the real Web Share API (`navigator.share`), falling back to the existing copy-link pattern (from B5) when unavailable, plus a direct "Share to WhatsApp" button wired to the graphics module's existing `GET /graphics/:id/share/whatsapp` endpoint (built in an earlier phase, never called from any frontend until now).
- **Scope call, not asked as a question**: no link/button was added to the existing public `players/[slug]` page to reach this — brief §6 permits exactly two additive changes to existing pages (both already used, C3 and E3), so a third would need a stop-and-ask. Chose not to touch that page at all rather than spend the question; the passport route stands alone, reachable via its own link (e.g. shared directly, or surfaced from other new Phase F/G screens) rather than from the existing player detail page.

### Known, not fixed this phase
- Same admin-sidebar mobile-nav gap and org-scoped-auth inconsistency noted in earlier phases still apply to whatever wasn't touched this pass.
- The Base UI `Select.Value` label bug (see above) is confirmed live in at least one pre-existing Phase 1/2 screen (`create-fixture-dialog.tsx`); likely others share it. Not swept fully — only the two instances actually touched by this project's monetisation phases (this phase's own new code, and Phase F's roster page) were fixed.
- No admin UI exists to grant a `MediaPackEntitlement` (mirrors E1/E2's same gap for `SponsorEntitlement`) — seeded directly via the existing purchase-and-confirm-transfer flow for this phase's live verification, same as Phase E's entitlement.

---

## Phase F — Academy workspace

**Status: built and verified live end-to-end.** Research found the backend substantially built already — age groups, four-status attendance (with the offline `clientEventId` idempotency contract already in place), annual-plan subscriptions, and termly-report PDF generation all existed with zero frontend. This phase built five new screens plus small additive backend gaps: a consolidated dashboard-stats endpoint, a subscription-history list (only the single current row existed before), and an `organisationId` filter on the teams endpoint (needed to let a coach pick which of their org's existing squads to attach to an age group — same precedent as Phase A's `organisationId` filter on competitions). Verified live end-to-end against real data: created an age group, assigned a real squad (Lagos Comets FC) to it, enrolled players, recorded attendance both from the UI and confirmed the offline queue's retry behavior, generated a real termly-report PDF with WhatsApp share link, and activated a real Elite academy plan producing a real draft invoice with the correct 20%-prepay-discounted total (₦300,000 → ₦240,000).

**Two real bugs found and fixed during this verification pass, both in the new offline-attendance queue:**
1. `useOfflineAttendanceQueue`'s `drain()` posted the raw queued item straight to the API, including its local-only bookkeeping fields (`queuedAt`, `attempts`, `lastError`). The API's `forbidNonWhitelisted` validator rejects unknown properties, so every single attendance tap failed with a 400 — this is the *exact* historical bug `offline-queue.ts` (Phase C, match capture) already has a code comment warning about, and I reproduced it by copying that file's shape without copying its `toPayload()` stripping step. Fixed by adding the equivalent `toPayload()` to the new queue.
2. Once fixed, a second issue surfaced: after a tap successfully synced, its highlighted status could disappear from the UI for up to 15 seconds — the item leaves the pending queue (sync succeeded) but the `today`'s-attendance query hadn't refetched yet, and nothing was invalidating it. Fixed by invalidating that query in the sync-success callback.

### F1 · Academy dashboard
- `/admin/organisations/[id]/academy` — roster size, age group count, attendance this week (present/total), plan status card with a "Choose a plan"/"Manage plan" link, and two entry cards into Roster and Attendance.
- Backend: `AcademyAgeGroupsService.getDashboard()` — one consolidated read (roster size via active players on any age-group-linked team, attendance-this-week via a Monday-00:00-UTC cutoff), same one-call shape as `SponsorDashboardService.getForSlug()` from Phase E.

### F2 · Roster and age groups
- `/admin/organisations/[id]/academy/roster` — every age group as a card, its assigned squad's roster with photos/shirt numbers, a "New age group" dialog, an "Assign squad" dialog (lists the org's own teams via the new `organisationId` filter), checkbox multi-select with a "Move to age group" bulk action, and a per-player "Report" button opening F4's dialog.
- **Scope call, not asked as a question**: "bulk actions" has no batch endpoint to reuse (`enrollPlayer` is one-at-a-time) — built as a client-side loop over the existing endpoint (move N selected players to a different age group), the only bulk-capable action this domain actually has today.

### F3 · Attendance
- `/admin/organisations/[id]/academy/attendance` — age-group tabs, one card per player with four large tap targets (Present/Late/Excused/Absent), the persistent sync indicator reused verbatim from Phase C's match capture (`SyncStatusIndicator` — no fixture-specific copy inside it, genuinely generic). Today's already-recorded statuses (server + still-pending-locally) merge into one highlighted state per player.
- New `offline-attendance-queue.ts` — direct port of Phase C's `offline-queue.ts` shape (localStorage-backed, 4s drain, `clientEventId` idempotency, `STUCK_AFTER_ATTEMPTS`), backed by a `clientEventId` unique constraint the backend already had waiting for exactly this.

### F4 · Development reports
- Built as a dialog opened from a player's roster row, not a separate route — the backend's one endpoint already does dataset-generation, PDF upload, and WhatsApp-link construction in a single call, so a whole page for "pick a date range, generate, download or share" would be more surface than the feature needs. From/to date range → preview (attendance %, goals, assists) → Download PDF / Share to parent via WhatsApp, both confirmed working against real generated output.

### F5 · Academy plan and billing
- `/admin/organisations/[id]/academy/billing` — current plan (band + renewal date + invoice status), a band picker (Starter/Growth/Elite) with a prepay checkbox showing the live 20%-discounted total when no plan is active, and an invoice history list.
- Backend: `AcademySubscriptionsService.listForOrganisation()` — the existing `currentForOrganisation()` only ever returned the single active row; billing history needed every row (the model is explicitly "one row per year, append-only" per its own schema comment).
- **Frontend-only renewal-safety choice, not a backend change**: `subscribe()` has no guard against double-subscribing while a plan is already active (confirmed in research — calling it twice just creates two overlapping rows). Rather than invent new backend business logic not asked for, the picker/activate UI only renders when there is *no* current active subscription — the same "hide the action instead of guarding the endpoint" pattern already used for A4's "Pay licence" button.

### Known, not fixed this phase
- Same admin-sidebar mobile-nav gap and org-scoped-auth inconsistency noted in earlier phases still apply to whatever wasn't touched this pass (`PlayersController.create` is still platform-`ADMIN`-only, not org-scoped — an org's own `COACH` member cannot create a brand-new player record, only enroll/move existing ones).
- Termly-report generation has no gate tying it to an active academy plan or the (defined-but-unused) `ADD_ONS.DEV_REPORT_TERM` price — confirmed via research this was already true before this phase; not something this phase's screens were asked to add.
- `AcademyAgeGroup` → `Team` is modeled as one-to-many in the schema, but `enrollPlayer()` always picks the first team found for an age group — a latent gap if an org ever needs multiple squads per age group, not something F2's UI works around.

---

## Phase E — Sponsor

**Status: built and verified live end-to-end.** Research before building found E1 and most of E2's backend already fully built and wired — `GET /competitions/:slug/sponsor-dashboard` (`@Public()`, no auth at all — the brief's own "link-access" requirement was already solved architecturally by simply not gating the route) and the full JSON/CSV/PDF impact-report trio (gated by organiser login + a `SponsorEntitlement` grant), both with zero frontend callers before this phase. This phase was almost entirely frontend, plus one small additive backend change (branding fields on the dashboard payload) and a set of admin form fields to make the `sponsorLogoUrl`/`primaryColor`/`secondaryColor` fields — already accepted by the API, previously reachable only via a raw request — actually usable by a real admin. Verified live: E1 renders correctly at both mobile (390px, screenshotted per the brief's "sponsor will screenshot this on a phone" requirement) and desktop widths, with the competition's `primaryColor` driving a top accent bar and its sponsor logo/branding rendering only when set; E2's report renders real data with `Verified`/`Estimated` tags on the correct figures, downloads a real PDF (confirmed via direct request — a valid S3 URL) and a real CSV (confirmed via direct request — correct report content), and shows an honest, non-scary empty state for a competition with no `SponsorEntitlement` granted; E3's branding slot appears additively on the public competition page with a configured sponsor and (confirmed via the same page rendering cleanly for competitions with no sponsor set) causes zero visual change when unconfigured.

No bugs found during this pass — every screen worked on the first live check.

### E1 · Sponsor dashboard
- `/sponsor/[slug]` — public, no login (matches the backend's own design), mobile-first stat grid (teams, players, matches verified/played, communities reached, minutes of football, digital reach), competition logo, sponsor logo when configured, and a `primaryColor`-driven accent bar. Honesty line at the bottom: "Every figure above is derived live from the verified match record — nothing here is hand-entered," matching brief §5.1's stated selling proposition, which the backend service's own code comment already existed to enforce.
- Backend: `SponsorDashboardService.getForSlug()` extended to also select+return `competitionLogoUrl`, `sponsorLogoUrl`, `primaryColor`, `secondaryColor` — small additive change to an already-complete, already-tested service; existing spec updated for the new fields, all 30 sponsorship-module tests still pass.
- Discoverable from `/admin/organisations/[id]/competitions/[slug]` (A4) via a new "Open sponsor dashboard" link (opens in a new tab, since this is meant to be a link an organiser hands to a sponsor, not an in-app navigation target).

### E2 · Impact report view and download
- `/admin/organisations/[id]/competitions/[slug]/impact-report` — reach stats, teams/communities table, players-by-age-group-and-gender table, player outcomes (when any exist), "Download CSV"/"Download PDF" buttons calling the pre-existing, already-tested endpoints directly.
- **The brief's core requirement, built from scratch (nothing to reuse — this concept didn't exist anywhere in the codebase)**: every reach figure carries a `VerificationTag` — a green "Verified" badge for hard counts genuinely derived from confirmed tables (teams/players/matches/communities/minutes/branded-graphics), or an amber "Estimated" badge *with its basis printed as plain visible text, never a hover-only tooltip* (a sponsor reading a downloaded PDF has no hover) for the two figures that are approximations: page views (counted from API requests to the public page, not confirmed unique visitors) and graphics shared (counted when a share link is requested, not when a share is confirmed sent). Which figures needed which label wasn't guessed — it was read directly from `MONETISATION_UI_PROGRESS.md`'s own Phase 4 entry, which already documented this distinction in prose but never surfaced it to any consumer of the API.
- A competition without a `SponsorEntitlement` grant gets a plain, honest "Impact Report isn't enabled for this competition — contact the platform team to enable it" card instead of the API's raw 403 — verified live against a real ungranted competition.

### E3 · Sponsor branding slot
- Purely additive to the existing public `/competitions/[slug]` page (the brief's second and last permitted additive change to an existing page, per §6) — a `SponsorBrandingSlot` component, same null-when-absent shape as C3's `VerifiedRecordBadge`, dropped into the existing header `Card`. Renders "In partnership with [logo]" when `sponsorLogoUrl` is set, renders nothing at all otherwise — confirmed live on both a competition with a sponsor configured and (implicitly, since every other competition page in this session's testing rendered with no visual change) one without.
- **Real scope call, asked and confirmed**: `Competition.sponsorLogoUrl`/`primaryColor`/`secondaryColor` already existed in the schema and API from an earlier phase but had zero admin UI anywhere — genuinely unreachable except via a raw API call. E3 itself only asks for the public slot, but user's call was to also add these three fields to the existing competition edit dialog (same `Input` pattern already used for `logoUrl`; colour fields use native `type="color"` pickers) so the feature has a real, usable path end to end rather than being demo-only.

### Known, not fixed this phase
- Same admin-sidebar mobile-nav gap and org-scoped-auth inconsistency noted in earlier phases still apply to whatever wasn't touched this pass.
- No admin UI exists for granting a `SponsorEntitlement` (the `POST /sponsor-entitlements` endpoint has no frontend caller) — not asked for by E1/E2/E3, and granting one is a rare, high-touch platform action (closing a sponsor deal), not a self-serve flow; seeded directly via the API for this phase's live verification.

---

## Phase D — Billing

**Status: built and verified live end-to-end.** Research before building found the backend for this phase almost entirely pre-existing (`Payment`, `Invoice`, `InvoiceLine`, `WebhookEvent` models; `PaymentsService`/`PaystackWebhookService`/`InvoicesService`/`PaymentReconciliationService` all complete and tested) — this phase was overwhelmingly a frontend build, plus small additive backend gaps: a payments-list endpoint, a revenue-aggregation query, a webhook-log list, and invoice PDF generation. Verified live against the real API: D1 renders a real payment history (mixed CASH/BANK_TRANSFER, various statuses) pulled straight from `Payment` rows created in earlier phases; a test invoice created and issued via the API to prove the previously-empty `Invoice` table renders correctly (line items, discount row, total, "Due" vs "Paid" state) and its "Download PDF" button correctly calls the new PDF endpoint. D2's full mark-paid-by-transfer flow was run end-to-end — confirming a pending transfer moved it out of the reconciliation list, updated "Total collected"/"Total outstanding" and both by-organisation/by-competition breakdowns immediately, and fired the same `fulfilPayment()` path a Paystack webhook would.

**One real infrastructure issue found during this verification pass (not a code bug, but blocked a real feature until fixed):** invoice PDF generation 500'd — `S3StorageService.putObject()` was hitting `ECONNREFUSED 127.0.0.1:9000` from inside the `api` container, because its `S3_ENDPOINT` was literally `127.0.0.1:9000`, which inside a container means the container itself, not the `minio` service. Separately, MinIO's own log showed `no online disks found — Insufficient number of drives online`, meaning its data volume wasn't mounted correctly either. Both were on the user's VM/Docker Compose config, not app code; fixed by pointing `S3_ENDPOINT` at the `minio` service name and repairing MinIO's volume mount, then reconfirmed the PDF endpoint returns a real uploaded URL.

**One stop-and-ask surfaced from Phase 0, resolved by the user:** `MONETISATION_UI_INVENTORY.md` §15.11 had already flagged that `admin/layout.tsx`'s sidebar has no mobile presentation at all, and named D1/D2 as inheriting that gap — but this was never actually raised during Phase A (A4) or Phase B (B6), which quietly shipped desktop-only too. Raised it explicitly this time; user's call was to match the existing precedent (leave desktop-only for now) rather than fix shared admin chrome mid-phase.

### D1 · Organiser billing centre
- `/admin/organisations/[id]/billing` — invoices (status badge, line items, discount, total, "Due"/"Paid" state, "Download PDF"), payment history as a receipts list (reference, provider, date, status, amount). Linked from a new "Billing" button on the org detail page.
- **Scope call, not asked as a question**: no invoice-creation UI was built here. The only existing caller of `InvoicesService.create()` is `AcademySubscriptionsService` (Phase F, not yet built) — invoices in this codebase are created by a domain flow when something is purchased, never drafted ad hoc by a staff form, and the brief's own D1/D2 descriptions never mention creating one. Confirmed by evidence (grepped every caller), not assumed.
- Backend: `POST /invoices/:id/pdf` — same render-then-upload-to-S3 shape as `ImpactReportService`/`TermlyReportService` (Phase 4's PDF reports), reusing `PdfBuilder`/`PdfRendererService`/`S3StorageService` as-is, no new PDF layout primitives. `GET /payments?organisationId=` — the payments controller had no list route at all before this.

### D2 · Internal revenue admin
- `/admin/revenue` — role-gated to `SUPER_ADMIN` only (see decision below), summary cards (total collected/outstanding), collected-by-organisation and collected-by-competition tables, a reconciliation table (every `PENDING` payment across every organisation, oldest first, with "Mark paid by transfer" for `BANK_TRANSFER`/`CASH` or "Re-verify" for `PAYSTACK`), and a paginated webhook log (event type, provider, signature-validity badge, reference, received time, processed/error status). New nav entry in `admin/layout.tsx`, `SUPER_ADMIN`-only.
- **Real architecture decision, asked and confirmed**: the brief calls D2 "internal revenue admin (yours only)," but every existing `/admin` page in this codebase gates to `ADMIN` *or* `SUPER_ADMIN`. Since this data isn't org-scoped (a `SUPER_ADMIN`-gated page would otherwise let any org's own `ADMIN` see every other organisation's cash/webhook data), user's call was `SUPER_ADMIN`-only — the first page in the app to use that gate.
- New `TransferConfirmDialog` — same required-reason shape as B6's `CashOverrideDialog`, generalized from "cash at the venue" to any pending `BANK_TRANSFER`/`CASH` payment platform-wide, with a bank-reference field and proof upload reusing the existing `ImageUploadField`/presigned-S3-upload flow verbatim (no new upload widget).
- Backend, all in `PaymentsService`/`PaystackWebhookService`, all additive: `listNeedingReconciliation()` (every `PENDING` payment, oldest first), `getRevenueSummary()` (collected/outstanding totals plus by-organisation and by-competition breakdowns — competition attribution differs by `Payment.purpose`: `LICENCE` payments point straight at a competition, `PLAYER_REGISTRATION` payments point at a team, so the competition comes from the `PlayerRegistration` rows that payment funded instead), `listRecent()` on the webhook log (paginated read of the append-only table every webhook write already populates). No chart library — plain numbers and tables throughout, per brief §7.
- Frontend `confirmBankTransfer()` was previously exported but never called by any page (B6 uses the separate `recordCashOverride()` path) — extended its signature from a bare `reference` string to the full `{providerReference, transferProofUrl, transferNote}` the backend DTO already supported, since D2 is the first real caller.

### Known, not fixed this phase
- Admin sidebar mobile nav gap (see above) — inherited, not fixed, per the user's explicit call.
- Same org-scoped-auth inconsistency noted in earlier phases still applies to whatever wasn't touched this pass.
- D2's reconciliation view surfaces stale `PENDING` `PAYSTACK` payments with a "Re-verify" action, but doesn't duplicate `PaymentReconciliationService`'s own 30-minute staleness threshold in the UI — it just lists every `PENDING` row regardless of age, on the reasoning that a human deciding whether to act doesn't need the same threshold as the automated job.

---

## Phase C — Scouting console and match-record trust

**Status: built and verified live end-to-end.** C2 (`/scout/fixtures/[id]`) already had a real, previously-shipped implementation with a solid offline-queue foundation — the user's explicit call was to rework it in place rather than replace it, so the offline queue, hash-chain event model, and idempotent `clientEventId` retry logic were kept as-is and only the recording UI changed. Verified live against the real API and dev frontend: C1's fixture list renders and correctly falls back to a cached list with an offline banner when the network drops; C2's event-capture panel is genuinely non-modal (rest of the page stays visible and tappable while it's open), period-control taps are instant with no panel at all, the persistent sync-status indicator reflects online/syncing/stuck states correctly, and the full correction flow (tap "Correct" on a timeline row → reason required → files a `CORRECTION` event, never edits/deletes the original) works end-to-end; C3's verified-record badge appears on a public fixture with recorded events and its dialog shows the correct event count, recorder identity, and verified date, matching the API's `GET /fixtures/:id/verify` response directly.

**One real bug found and fixed during this verification pass:** the offline fallback banner on `/scout` (C1) said "Offline — connect to load your fixtures" even while the fixture list was still visibly rendered right below it — the copy's condition only checked the localStorage-cache path (`fixtures === null && cached`), missing the far more common case where react-query still has the last-fetched data in memory (network fetches just stop firing while offline; the data doesn't disappear). Fixed by keying the banner text off what's actually being displayed (`shown`, not `fixtures`) so the two never contradict each other.

### C1 · Scout fixture list
- `/scout` — role-gated (SCOUT/ADMIN/SUPER_ADMIN), lists LIVE + SCHEDULED fixtures. **User's explicit call**: no fixture-assignment concept exists in the backend (any privileged user can record on any fixture today), so this lists everything a scout can actually act on rather than a subset that doesn't correspond to any real permission boundary.
- New: `fixture-list-cache.ts` (localStorage-backed last-known-good list) and `use-online-status.ts` (`navigator.onLine` + online/offline listeners) so the list still renders — with an honest "may be out of date" banner — when a scout opens the app with no signal at the pitch.

### C2 · Match event recorder rework
- `/scout/fixtures/[id]` reworked in place. Primary actions (Goal/Card/Substitution, split home/away) stay immediately reachable as large tap targets; period controls (Kickoff/Half time/Full time) fire as one instant tap with no intermediate UI since they need no team/player; everything else collapses under "More events."
- **Brief §5/§4.4 "no blocking modal in the recorder" enforced by construction**: the pre-existing `RecordEventDialog` used the shared `Dialog` primitive (backdrop + focus trap) — replaced with a new, genuinely non-modal `EventCapturePanel` (`fixed inset-x-0 bottom-0`, no backdrop, Escape-key dismiss, composed fresh rather than from `Dialog`/`Sheet` since both share the same modal mechanism under Base UI). A recorder can now tap a competing urgent action without first dismissing whatever's open. `record-event-dialog.tsx` deleted (confirmed unused after the rework).
- New `SyncStatusIndicator` — always visible (never hidden at zero, per brief), shows online/synced, syncing-N, and stuck states with a manual "Sync now" retry.
- New `CorrectionPanel` — the only way to amend a past event; shows the original read-only, requires a reason (≥3 chars), fires a `CORRECTION` event carrying `correctsEventId` + `correctionReason`. The event log itself stays strictly append-only — nothing is ever edited or deleted.
- Backend: no new endpoints — `recordEvent()` already validated `CORRECTION`'s required fields. `RecordMatchEventInput` (frontend) and the offline queue's payload builder gained pass-through for `correctsEventId`/`correctionReason`.

### C3 · Verified-record badge
- Purely additive to the existing public `/fixtures/[id]` page (one of the brief's two permitted existing-page edits): a "Verified record" badge appears only when the fixture's event chain is present and valid (renders nothing otherwise — a broken chain is an internal signal, never a scary badge shown to a public visitor). Clicking it opens a dialog with the exact required copy, event count, recorder identity, and verified date.
- Backend: `MatchEventsService.verifyChain()` extended to look up and return distinct recorder display names (`recordedBy: string[]`) alongside the existing hash-chain verification result. `VerifyMatchEventsResult` (in `@4ef/shared`) gained the field; 2 existing Jest tests updated for the new `prisma.user.findMany` call — all 55 tests in the matches module still pass.

### Known, not fixed this phase
- Same org-scoped-auth inconsistency and missing age-group validation noted in earlier phases still apply to whatever wasn't touched this pass.
- Fixture assignment (a scout seeing only *their* fixtures, not every fixture) has no backing concept in the backend — C1 lists everything a privileged user can act on instead, per the user's call above.

---

## Phase B — Club registration and the payment gate

**Status: built and verified live end-to-end.** Full flow run against the real API: claimed an unclaimed team through B2's auto-skipping wizard → added a player through B3 (already-approved pilot) → paid via B4's bank-transfer path → watched B5's status page (both the authenticated view and the actual public share link, opened in a separate unauthenticated browser context) reflect it correctly → used B6's organiser console to cash-override a second registration, checkbox → mandatory-reason dialog → confirm → team badge flips to "fully paid" with a toast. Screenshots confirm every screen renders correctly, not just typecheck-clean. B3 (squad builder) was already built and approved as the pilot; this covers B1, B2, B4, B5, B6.

**Two real bugs found and fixed during this verification pass:**
1. `CheckoutRegistrationsDto.payerEmail` was required, but B4 never sends one (bank transfer doesn't need it) — checkout failed outright. Same class of bug already fixed for licence payments in Phase A, missed in this twin code path. Fixed the same way: optional, falls back to the current user's account email server-side.
2. B6's console showed "Unknown team" for every club — it was cross-referencing `CompetitionEntry` (a separate, admin-only "add team to competition" mechanism for standings) to resolve team names, but registering a squad never requires or creates one. Fixed at the root: `listForCompetition()` now includes the team directly in its Prisma query, so the frontend never needs to cross-reference a second, possibly-empty list.

### B1 · Public registration landing
- `/register/[competitionSlug]` — the only Server Component page in the app (deliberately: WhatsApp's link-preview crawler doesn't execute JS, so this needed real SSR'd `generateMetadata`, not a client fetch). Shows branding, registration window, per-player cost, what a club needs to hand over, one CTA.
- Backend: `registrationOpensAt`/`registrationClosesAt` added to `UpdateCompetitionDto` (were real DB columns, never settable). Deliberately did **not** expose `registrationFeeKobo` as settable — it's never read by the actual pricing logic (`PlayerRegistrationsService.register()` always prices off `PLAYER_REGISTRATION.STANDARD`), so making it settable would let an organiser configure a price checkout doesn't honour. The landing page shows the real `STANDARD` price from `@4ef/shared` instead.

### B2 · Club account creation
- `/register/[competitionSlug]/start` — 3-step (Account → Club → Team), each step auto-skipped if already satisfied (logged in, has an org). Reuses the app's existing register form/hook verbatim.
- **User's explicit call**: teams are *claimed*, not self-service-created — admins keep pre-creating teams as today; a new club searches unclaimed teams (`organisationId IS NULL`) and attaches one to itself. Backend: `POST /teams/:id/claim` (org-scoped, one-way — a claimed team can't be claimed again by anyone) + `?unclaimed=true` filter on `GET /teams`.
- **Real limitation, stated in the UI copy, not hidden**: if no matching unclaimed team exists, the club is stuck — "Can't find your team? Ask the competition organiser to add it first." This is the direct cost of the claim-not-create decision.

### B4 · Squad review and payment
- `/register/[competitionSlug]/squad/[teamSlug]/pay` — checkbox-per-player selection (defaults to all unpaid), explicit consequence copy when a partial subset is selected ("Only the N players you pay for now become eligible..."), same 6-state payment machine as A3's checkout, card + bank transfer. No backend gaps — `checkout()` already supported partial payment exactly as specified.

### B5 · Squad status / shareable link
- `/register/[competitionSlug]/squad/[teamSlug]/status` (authenticated, "Copy shareable link") and the public `/squad-status/[competitionSlug]/[teamSlug]?token=` (no login). **User's explicit call**: public, token-gated rather than login-gated.
- Backend: stateless HMAC-signed token (`squad-share-token.ts`, keyed off `JWT_ACCESS_SECRET`) — no new table/column/migration, unguessable without the secret. Trade-off, noted in the code: not individually revocable. The public read is deliberately narrow — player name + status + aggregate owed only, never guardian consent fields or per-player price.

### B6 · Organiser registration console
- `/admin/organisations/[id]/competitions/[slug]/registrations` — every club grouped with paid/unpaid counts, per-player checkboxes, "Mark selected paid (cash)" with a mandatory-reason dialog.
- **Bulk reminder actions were not built** — there is zero notification/email/SMS infrastructure anywhere in this codebase. That's a separate feature, not a small addition; building a fake "send reminder" button that does nothing would be worse than omitting it.
- Backend: `POST /competitions/:competitionId/registrations/cash-override` — a **new, separate** method from the existing `checkout()`/`confirmBankTransfer()` pair, deliberately: those are org-scoped to the *paying club*, but this action is the *competition organiser* acting on a club's behalf — almost certainly a different organisation than the one being credited. Reuses `confirmBankTransfer()`'s existing `confirmedById`/`transferNote` logging internally. Also loosened `POST /payments/:id/confirm-transfer` from platform-admin-only to org-scoped, and made `transferNote` mandatory specifically for `CASH` overrides (bank transfers can lean on a reference/proof instead).

### Known, not fixed this phase
- Same org-scoped-auth inconsistency noted in Phase A still applies to whatever wasn't touched this pass.
- B5's share link can't be revoked individually (stateless-by-design trade-off, see above).
- Registration/eligibility still isn't validated against a competition age group — `Competition` has no such field (same finding as the B3 pilot).

---

## Phase A — Organiser onboarding and competition licensing

**Status: built and verified live end-to-end** (org create → wizard → tier selection → competition created → licence checkout via bank transfer → payment created and correctly shown as "Awaiting confirmation" with a real reference → dashboard reflecting live registration/licence state). Screenshots confirm all four screens render correctly against the real API, not just typecheck-clean.

One real bug found and fixed during live verification: A3 originally had two separate buttons that both effectively meant "I've sent it" — the actual submit action, and a redundant second acknowledgment button on the awaiting-confirmation view. Removed the second one and rewrote the awaiting-confirmation copy to be honest about what's actually known at that point (a bank transfer is *claimed* sent, not *confirmed* received — worded accordingly, distinct from the card-payment copy).

### A1 · Organisation setup
- `/admin/organisations` — list (Table, matches `admin/teams` pattern), "New organisation" dialog.
- `/admin/organisations/[id]` — org detail card, competitions list, members list, "Add member" dialog.
- **Deviation from brief**: no email-invite flow exists on the API (`POST /organisations/:id/members` needs an existing user's `userId`, not an email). Composed the closest honest thing — a search-and-pick dialog against the platform user directory (`GET /users/admin/all?search=`) — rather than fake an invite email. Documented in the dialog's own copy, visible to whoever uses it.
- Files: `features/organisations/{api,schemas,organisation-form-dialog,add-member-dialog}.tsx`, `app/admin/organisations/page.tsx`, `app/admin/organisations/[id]/page.tsx`.

### A2 · Competition creation wizard
- 4-step wizard (Basics → Team count → Tier → Review) at `/admin/organisations/[id]/competitions/new`.
- Tier step: 4 selectable cards (Community/League/Championship/Federation) with real team bands + `Money`-formatted pricing from `COMPETITION_TIERS`, auto-recommends based on entered team count, organiser can override.
- **Deviation from brief**: dropped the "venues" step — `Competition` has no venue-related field in the schema at all (fixtures have per-fixture `venueName`, competitions don't), so there's nothing to persist. Not faked.
- New `Stepper` component (`features/competitions/wizard/stepper.tsx`) — no Tabs/stepper primitive existed; composed from existing colour tokens only (`bg-primary`/`bg-muted`, same pairing as every other status indicator).
- Files: `features/competitions/wizard/{stepper,competition-wizard}.tsx`, `app/admin/organisations/[id]/competitions/new/page.tsx`.

### A3 · Licence checkout
- `/admin/organisations/[id]/competitions/[slug]/checkout` — line item + total (`Money`), method choice (card via Paystack / bank transfer), all 6 payment states from brief §4.3 (idle, processing, awaiting confirmation, confirmed, failed, expired).
- **Deviation from brief (confirmed with the user)**: the 50/50 instalment schedule and onboarding fee aren't implemented server-side — `PaymentsController.initializeLicencePayment` always charges the full tier price in one shot, and `ONBOARDING_FEE_KOBO` is defined in `pricing.ts` but referenced nowhere in the API. Built for full payment only rather than showing a schedule that doesn't actually track or charge correctly. Flagged as a real backend feature to design properly later, not a small addition.
- Bank transfer's "I've sent it" is a client-side acknowledgment only — there's no `Payment` column to record it, and the payment is already in the correct PENDING/awaiting-confirmation state the moment it's created (bank-transfer payments skip the Paystack call entirely in `PaymentsService.initialize()`).
- New `PaymentStatusBadge` (`components/monetisation/payment-status-badge.tsx`) — reuses the existing `--live` token (already used on the homepage's live-match indicator, just never componentised) for "Paid," existing Badge variants for everything else. Always paired with an icon + word, never colour alone (brief §4.6).
- Files: `features/payments/api.ts`, `components/monetisation/payment-status-badge.tsx`, `app/admin/organisations/[id]/competitions/[slug]/checkout/page.tsx`.

### A4 · Competition dashboard
- `/admin/organisations/[id]/competitions/[slug]` — licence status card (with "Pay licence" link when unpaid), teams-entered / players-registered-and-paid / outstanding-money stat row, upcoming fixtures list.
- Files: `app/admin/organisations/[id]/competitions/[slug]/page.tsx`.

### Backend additions this phase needed (all reviewed and approved before writing, see conversation)
- `PATCH /competitions/:id/tier` — previously no endpoint could set a competition's tier at all; licence checkout prices strictly off this field.
- `GET /organisations/admin/all`, `GET /organisations/:id/members` — previously only "mine" or a single org by id existed; members list existed only as a write target.
- `GET /payments/:id`, `GET /payments/bank-details` — payments controller had zero GET routes before this; bank account details existed only as unread env vars.
- `GET /competitions/:id/registrations` — player-registrations could be written but never listed back.
- `POST /payments/initialize`'s `provider` — was hardcoded to `PAYSTACK` for licence payments; now optional, defaulting to `PAYSTACK`, so bank transfer is actually selectable.
- `GET /competitions/admin/all?organisationId=` filter — nothing could list one organisation's competitions before this.
- All changes are additive (new routes/fields, no behaviour changes to existing ones), typechecked, and covered by the existing test suites (109 tests across `competitions`/`organisations`/`payments`/`player-registrations` — all still passing). `4ever-roles&permissions.md` updated for every new route.

### Known, not fixed this phase (flagged, not silently worked around)
- **Org-scoped authorization is inconsistent across modules.** `assertCanManage`/`assertCanCoach` exist and work correctly (used by player-registrations, the new org-members routes, the new payments/registrations GETs), but `/players`, `/competitions` (except the new `/tier` route), and `/organisations/:id` are still platform-`ADMIN`-only, not org-scoped. Everything built this phase is fully functional for a platform admin; a real club/organiser without a platform role cannot yet use it end-to-end. User's explicit call: build UI now, address auth as its own pass.
- No responsive/mobile-stacked table pattern was needed this phase (org/competition lists used `Card` rows, not `Table`, partly *because* of this known gap — see `MONETISATION_UI_INVENTORY.md` §15.8).

---

## Pilot screen — B3, squad builder

**Status: built and approved.**

See prior turn for the full side-by-side comparison against `competitions/[slug]` (the closest existing page). Summary: spacing rhythm, heading weight, button height and border colour all matched exactly (built from the same primitives). One real bug found and fixed — player names truncated against the action buttons at 375px; fixed by stacking actions below the name under `sm`.

Backend gaps surfaced: `/players` CRUD is platform-admin-gated (same systemic issue as above); no `GET` existed for registration/consent status at the time (now fixed by this phase's `GET /competitions/:id/registrations`); `Competition` has no `ageGroup` field, so the brief's "validate ages against the competition's age group" wasn't built — nothing to validate against.

---

## Phase 0 — Design system audit

**Status: complete, approved.** See `MONETISATION_UI_INVENTORY.md`.
