# Monetisation UI — Progress

Running log per `MONETISATION_UI_BRIEF.md` §8.5. Newest entries first.

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
