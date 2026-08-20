# Monetisation UI — Progress

Running log per `MONETISATION_UI_BRIEF.md` §8.5. Newest entries first.

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
