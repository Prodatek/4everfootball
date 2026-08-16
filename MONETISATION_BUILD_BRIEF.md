# 4EverFootball — Monetisation Build Brief

**Repo:** 4everfootball
**Owner:** David
**Purpose of this file:** the single source of truth for what we are building to make this app earn money, in what order, and to what standard. Claude Code should read this file before writing any code, and re-read the relevant phase before starting it.

---

## 0. Read this first

### The business model in four sentences

We do not monetise fans. We charge **competition organisers** and **academies** — the people already collecting money — for four things:

| Line | What | Who pays | Billing |
|---|---|---|---|
| **A — Competition Licence** | Run a competition on 4Ever for a season | Organiser | Per competition, per season |
| **B — Player Registration** | A verified, locked player record | Organiser (usually passed to clubs) | Per player, per season |
| **C — Academy Workspace** | Player records, attendance, development reports | Academy | Per year, banded by squad size |
| **D — Sponsor & Media** | Sponsor dashboard, impact report, club match graphics | Sponsor, billed via organiser | Per activation |

**Line B is the engine.** A 100-team competition with 20-player squads is ₦2,000,000 in registration fees against a ₦450,000 licence. Every technical decision that affects whether registration fees actually get collected is a high-stakes decision.

### The product's actual moat

The **append-only, tamper-proof match event log**. Not live scores — live scores are a commodity. In a market with a documented age-fraud problem and disputed results deciding real prize money, a record that nobody (including us) can silently edit is what people pay for. Anything that weakens that guarantee is a bug, not a trade-off.

### Non-negotiable market constraints

These are not preferences. Violating any of them breaks the business:

1. **Offline-first match capture.** Nigerian grassroots pitches do not have reliable signal. A recorder that fails mid-match destroys the customer relationship. Events must be captured locally and synced later, always.
2. **Bank transfer is a first-class payment method**, not a fallback. Nigerian organisations pay by transfer against an invoice. Card-on-file recurring billing fails and churns silently.
3. **Never recurring monthly card charges for organisations.** Sell seasons and years, invoiced.
4. **Naira only.** No dollar pricing anywhere in the UI or the data model.
5. **Money is stored as integer kobo.** Never a float. Never a decimal string that gets parsed loosely.

---

## 1. Phase 0 — Discovery (do this before writing any code)

**Do not skip this and do not start Phase 1 until you have reported back.**

I have not told you the stack because you can see it and I want your plan to fit the code that exists, not a generic one.

Investigate and then produce a written report covering:

1. **Stack** — framework, language, runtime, hosting, build/deploy pipeline.
2. **Database** — engine, ORM/query layer, migration tool, how migrations are run in production. If Supabase or similar: is RLS on, and what policies exist?
3. **Auth** — provider, session model, how roles/permissions are currently represented.
4. **Existing domain models** — the actual shape of Team, Player, Competition, Fixture, Match, and whatever holds match events. Paste the real schema, not a summary.
5. **How match events are written today** — is there an events table, are updates/deletes possible, is there any audit trail? Be blunt about how far this is from the immutable-log requirement.
6. **Realtime** — what mechanism powers live updates now (websockets, SSE, polling, Supabase realtime)?
7. **Frontend** — is it already a PWA? Is there a service worker? Any offline capability at all?
8. **Payments** — is anything integrated already? Any existing money-related tables?
9. **Multi-tenancy** — is there any concept of an organisation/account that owns a competition, or does everything hang off a single admin user?
10. **Tests** — what exists, what runner, is CI running them?

Then propose:

- A **revised phase plan** adapted to this codebase — tell me where my sequencing is wrong for this repo and why.
- The **five riskiest changes** and how you would de-risk each.
- Anything in the current schema that will fight the immutable-log design.

**Stop after this report.** I will confirm before you build.

---

## 2. Phase 1 — Immutable event log + offline capture

*Business deadline: Day 21. This is what makes the product trustworthy and demoable.*

### 2.1 The event log

Create (or migrate to) an **append-only** match event store.

```
match_events
  id                uuid pk
  match_id          uuid not null  -> matches(id)
  seq               integer not null          -- server-assigned, monotonic per match
  client_event_id   uuid not null             -- generated on the capture device
  type              text not null             -- GOAL | OWN_GOAL | YELLOW | RED | SUB_IN | SUB_OUT
                                              -- | PERIOD_START | PERIOD_END | KICKOFF | FULL_TIME
                                              -- | CORRECTION | NOTE
  minute            integer                   -- match minute, nullable for admin events
  added_time        integer
  period            text                      -- FIRST_HALF | SECOND_HALF | ET1 | ET2 | PENS
  team_id           uuid
  player_id         uuid
  related_player_id uuid                      -- assist, sub partner
  payload           jsonb not null default '{}'
  corrects_event_id uuid                      -- set only when type = CORRECTION
  correction_reason text                      -- required when type = CORRECTION
  recorded_by       uuid not null             -- user id of the recorder
  device_id         text not null
  captured_at       timestamptz not null      -- device clock, when it happened on the pitch
  recorded_at       timestamptz not null default now()   -- server clock, authoritative
  prev_hash         text
  hash              text not null

  unique (match_id, client_event_id)
  unique (match_id, seq)
```

**Rules — enforce these at the database level, not just in application code:**

- No `UPDATE` and no `DELETE` on `match_events`, ever. Add a trigger that raises an exception on both, or revoke the privileges from the application role. Application-layer discipline is not enough here — the whole product claim rests on this.
- `hash = sha256(prev_hash || canonical_json(row minus hash))`. Canonical JSON means sorted keys, no whitespace, explicit nulls. Write the canonicaliser once, test it hard, and never change it without a versioned migration.
- `prev_hash` is the `hash` of the event with `seq - 1` for the same match. First event of a match uses the match id as the seed.
- **Corrections are new rows, never mutations.** A mistake becomes a `CORRECTION` event pointing at `corrects_event_id` with a mandatory reason. The original stays visible forever.

**Derived state:** compute scores, cards, and the league table from the event stream (applying corrections), and cache them in a `match_state` / `standings` table for read performance. The cache is disposable and must be rebuildable from events alone. Write a `rebuild-from-events` command and put it in CI — if the cache and the replay ever disagree, that is a P0.

**Public verification endpoint:** `GET /api/competitions/:id/matches/:matchId/verify` recomputes the whole chain and returns `{ valid: true, events: N, firstHash, lastHash, verifiedAt }`. Surface it on the public match page as a small "Verified record" badge that a sceptical organiser can click. This is a sales feature — treat it as user-facing, not as an internal debug route.

### 2.2 Offline-first capture

The match recorder must work with the phone in airplane mode for a full 90 minutes and lose nothing.

- Make the recorder a **PWA** — service worker, installable, app shell cached, works cold-started offline.
- Queue events in **IndexedDB** (use `idb` or Dexie; do not hand-roll). Each queued event gets a client-generated UUID `client_event_id` and a local monotonic sequence.
- The UI reads from the local queue first, so the recorder always sees the correct running score regardless of connectivity.
- Sync opportunistically: on reconnect, on Background Sync where supported, on a timer, and via an always-visible manual **"Sync now"** control with a pending-event count.
- **Idempotency:** the sync endpoint accepts a batch and upserts on `(match_id, client_event_id)`. Re-sending the same batch ten times must produce identical state. Test this explicitly.
- The server assigns `seq` and computes hashes. Never trust device ordering, but do preserve `captured_at` so late-synced events land in the right match minute.
- Two recorders on the same match is a supported scenario, not an error. Both append; both identities are recorded; deduplicate in the UI by showing recorder identity rather than by silently dropping events.
- **Pre-match cache:** when a recorder opens a fixture while online, cache the full squad lists, player photos and match metadata so they are available offline.
- Show connection state permanently in the recorder UI: `Online · synced` / `Offline · 12 events queued`. Never hide it.

**Definition of done for Phase 1**

- [ ] Capture a full match with the device in airplane mode; reconnect; every event lands exactly once, in order.
- [ ] Attempting `UPDATE match_events` or `DELETE FROM match_events` as the app role raises an error.
- [ ] Replaying events from scratch reproduces the cached score and table exactly.
- [ ] The verify endpoint returns `valid: true` for a real match and `false` if a hash is tampered with in a test fixture.
- [ ] Re-posting the same sync batch is a no-op.

---

## 3. Phase 2 — The money path

*Business deadline: Day 30. Nothing earns until this ships.*

### 3.1 Organisations and tenancy

Competitions must belong to an **organisation**, not to a user.

```
organisations        id, name, type (ORGANISER|ACADEMY|SCHOOL_LEAGUE|FEDERATION),
                     contact_name, phone, email, address, rc_number, created_at
organisation_members organisation_id, user_id, role (OWNER|ADMIN|RECORDER|VIEWER)
```

Every competition, academy, invoice and payment hangs off `organisation_id`. If the DB supports RLS, enforce tenant isolation there as well as in the application layer.

### 3.2 Pricing as configuration, not as literals

One source of truth. **All amounts in integer kobo.** Never write a price literal anywhere else in the codebase.

```ts
// src/config/pricing.ts  — amounts in KOBO (₦1 = 100 kobo)
export const CURRENCY = 'NGN' as const;

export const COMPETITION_TIERS = {
  COMMUNITY:   { label: 'Community Cup',      maxTeams: 16,   minTeams: 0,   priceKobo:   7_500_000 },
  LEAGUE:      { label: 'League',             maxTeams: 48,   minTeams: 17,  priceKobo:  20_000_000 },
  CHAMPIONSHIP:{ label: 'Championship',       maxTeams: 120,  minTeams: 49,  priceKobo:  45_000_000 },
  FEDERATION:  { label: 'Federation / State', maxTeams: null, minTeams: 121, priceKobo: 120_000_000 },
} as const;

export const ONBOARDING_FEE_KOBO = 5_000_000;          // ₦50,000, waived on full prepay

export const PLAYER_REGISTRATION = {
  STANDARD:   { priceKobo: 100_000 },                  // ₦1,000
  PASSPORT:   { priceKobo: 250_000 },                  // ₦2,500
  VOLUME:     { priceKobo:  70_000, minPlayers: 3000 },// ₦700
  CARRY_OVER: { priceKobo:  40_000 },                  // ₦400
} as const;

export const ACADEMY_PLANS = {
  STARTER: { maxPlayers:  30, priceKobo:  4_500_000 },
  GROWTH:  { maxPlayers: 100, priceKobo: 12_000_000 },
  ELITE:   { maxPlayers: 300, priceKobo: 30_000_000 },
} as const;

export const ADD_ONS = {
  DEV_REPORT_TERM:        { priceKobo:  2_500_000 },
  SPONSOR_DASHBOARD:      { priceKobo: 15_000_000 },
  IMPACT_REPORT:          { priceKobo: 25_000_000 },
  SPONSOR_BUNDLE:         { priceKobo: 35_000_000 },
  MEDIA_PACK_PER_CLUB:    { priceKobo:  1_500_000 },
  MEDIA_PACK_COMPETITION: { priceKobo: 25_000_000 },
} as const;

export const ANNUAL_PREPAY_DISCOUNT = 0.20;
```

Add a `formatNaira(kobo)` helper and use it everywhere. No `toFixed(2)` on money. No floats.

### 3.3 Competition licensing and entitlements

```
competitions  + organisation_id
              + tier                 (COMMUNITY|LEAGUE|CHAMPIONSHIP|FEDERATION)
              + licence_status       (DRAFT|AWAITING_DEPOSIT|LICENSED|ACTIVE|CLOSED|SUSPENDED)
              + licensed_until       date
              + max_teams            integer   -- from tier, snapshotted at purchase
              + registration_fee_kobo integer  -- per player, snapshotted at purchase
              + registration_opens_at / registration_closes_at
```

- A single `can(competition, feature)` entitlement helper drives all gating. No scattered `if (tier === ...)` checks.
- **Free tier:** one competition per organisation, maximum 8 teams. Enough to taste, too small for a real competition.
- Never gate: the public fan view — live scores, fixtures, tables, player pages. That is distribution, not product.
- Always gate: verified player records, data export, historical downloads, sponsor reporting, multi-admin, API.
- Adding teams beyond `max_teams` triggers an upgrade quote rather than a hard block — never let a customer hit a wall mid-season with money in hand.

### 3.4 Club self-registration with a payment gate

**This flow is the revenue engine. Build it carefully.**

```
Public registration link  /register/:competitionSlug
  → club creates account (phone + OTP or email)
  → club submits squad: name, DOB, position, photo, guardian consent for U18
  → server prices the squad server-side from pricing.ts
  → payment (Paystack, or "pay by transfer" → pending)
  → webhook confirms → squad transitions DRAFT → CONFIRMED
```

Squad states: `DRAFT → PENDING_PAYMENT → CONFIRMED → LOCKED`.

- **A squad is not eligible to be selected for a fixture until it is `CONFIRMED`.** Enforce this server-side at fixture selection. This single rule is the difference between collecting most of Line B and collecting a fraction of it.
- Once `LOCKED` (at registration close), player records become immutable — same treatment as match events. Additions after lock require an organiser-approved, logged exception.
- Partial payment is allowed: a club can pay for 15 of 20 players; only the paid 15 become eligible.
- Organiser override exists (for the club paying cash at the venue) but is **always logged** with the admin's identity and a reason.

### 3.5 Paystack integration

Get this exactly right. Payments bugs cost trust that cannot be bought back.

- Enable **card, bank transfer and USSD** channels. In this market transfer will be the majority.
- **Amounts are always recomputed server-side** from `pricing.ts`. Never accept an amount from the client. Ever.
- Flow: `POST /api/payments/initialize` → server creates a `payments` row (`PENDING`) with its own `reference` → calls Paystack initialize → returns authorization URL.
- **Entitlement is granted by the webhook or by an explicit server-side verify call. Never by the browser redirect.** A user closing the tab must still get what they paid for; a user replaying the success URL must not get it twice.
- **Webhook:** verify `x-paystack-signature` as HMAC-SHA512 of the raw body using the secret key. Compare with a timing-safe equality function. Reject anything that fails. Use the **raw** body — if the framework parses JSON before you can hash it, configure a raw-body route.
- Respond `200` immediately, process asynchronously, and make processing **idempotent keyed on the Paystack reference**. Paystack will retry; duplicate fulfilment is the classic failure here.
- Store every webhook payload raw in a `webhook_events` table before processing. When something goes wrong at 9pm on a matchday you will need it.
- Reconciliation job: for any payment `PENDING` for more than 30 minutes, call Paystack verify and settle the state. Run it every 10 minutes.

```
payments
  id, organisation_id, reference (unique), provider (PAYSTACK|BANK_TRANSFER|CASH),
  provider_reference, amount_kobo, currency, status (PENDING|PAID|FAILED|REFUNDED|ABANDONED),
  purpose (LICENCE|ONBOARDING|PLAYER_REGISTRATION|ACADEMY_PLAN|ADD_ON),
  subject_type, subject_id, paid_at, raw_response jsonb, created_at

webhook_events
  id, provider, event_type, provider_reference, signature_valid boolean,
  raw_body text, processed_at, processing_error, created_at
```

### 3.6 Manual bank transfer — treat as a primary path

Most organisers will pay by transfer against an invoice.

- Admin screen: mark an invoice paid, attach the transfer reference and optionally a proof image, record who confirmed it.
- **It must run the exact same fulfilment code path as a Paystack webhook.** One `fulfilPayment(payment)` function, called from both. Two divergent paths is how customers end up paid-but-not-provisioned.

### 3.7 Invoices and quotes

```
invoices  id, organisation_id, quote_number (human: 4EV-2026-0001), status
          (DRAFT|SENT|PART_PAID|PAID|CANCELLED|EXPIRED),
          subtotal_kobo, discount_kobo, total_kobo, valid_until,
          deposit_kobo, balance_kobo, issued_at, paid_at
invoice_lines  invoice_id, description, basis, quantity, unit_kobo, amount_kobo
```

- Sequential human-readable quote numbers. Organisers need them for their sponsor's records, and looking institutional is worth money in this segment.
- Server-rendered PDF (React-PDF, Puppeteer, or whatever the stack already uses) with the business name, RC number, bank details and 14-day validity.
- Default schedule: **50% on signature, 50% before first matchday** — model these as two payment milestones on the invoice, not as one lump.

**Definition of done for Phase 2**

- [ ] A club can register, pay, and become `CONFIRMED` end to end on a real Paystack test key.
- [ ] An unpaid squad cannot be selected for a fixture — verified by an API-level test, not just the UI.
- [ ] Replaying a webhook ten times fulfils exactly once.
- [ ] A tampered webhook signature is rejected and logged.
- [ ] Marking an invoice paid by transfer provisions identically to a card payment.
- [ ] No money literal exists anywhere outside `pricing.ts` (add a lint rule or a grep test in CI).
- [ ] No float arithmetic touches money anywhere.

---

## 4. Phase 3 — The media engine

*Business deadline: Day 45. This is both a paid feature (Club Media Pack) and our entire marketing channel.*

Build **one** templating pipeline that renders branded PNGs from match data. Satori + resvg, or the framework's OG-image support, or headless Chromium — whichever fits the stack best. Consistent 1080×1080 and 1080×1350 outputs, plus 1080×1920 for status/stories.

Ten templates, all generated from data we already store:

1. Full-time result card — fires on `FULL_TIME`
2. Goal alert card — fires live on `GOAL`
3. Matchday fixtures card — 7am on a matchday
4. League table card — end of each round
5. Top scorers leaderboard — weekly
6. Player of the Week — weekly
7. **Player passport card** — on registration and on demand
8. Head-to-head preview — day before a fixture
9. Milestone card — thresholds (100th goal, 500th player)
10. Season summary — final matchday

Requirements:

- Every image carries a small, tasteful `4ever.buildspecs.io` mark. A signature, not a banner — clubs will not post something that looks like an advert.
- Competition branding (logo, sponsor logos, colours) is configurable per competition and applied automatically.
- **One-tap share** on the player passport, sized for WhatsApp status. Players are the most motivated distributors available to us; do not put friction in front of them.
- Generate asynchronously via a job queue, cache aggressively, serve from CDN. Never block a request on image rendering.
- Gate by entitlement: Club Media Pack is a paid add-on, but leave the player passport ungated — it is the acquisition loop.

**Definition of done:** a goal captured on the pitch produces a shareable branded image within 60 seconds, and a club admin can download every graphic for their team from one screen.

---

## 5. Phase 4 — Sponsor reporting and academy workspace

*Business deadline: Day 75.*

### 5.1 Sponsor dashboard and impact report

Everything below must be **derived from the verified record**, never hand-entered. That is the entire selling proposition.

- Sponsor-branded public competition page (logo, colours, custom slug).
- Live sponsor dashboard: teams registered, players registered, matches played, matches verified, communities/LGAs covered, total minutes of football, page views, graphics shared.
- Attendance capture per fixture (recorder enters a figure at half-time) so the reach numbers are real rather than claimed.
- **Impact report generator:** a designed PDF plus a CSV/JSON dataset. Sections matching the sponsorship proposal — teams and communities, players by age group and gender, matches played and verified, minutes delivered, digital reach, branding delivery, player outcomes.
- `player_outcomes` table: trials, call-ups, signings, with a source note and a link back to the player record. This is the number sponsors care about most and nobody else can produce it.

### 5.2 Academy workspace

- Annual plans banded by squad size; invoiced annually, 20% prepay discount. **No monthly card billing.**
- Attendance tracking — four taps per player, works offline, same sync mechanism as match capture.
- Age groups, coach accounts, squad management.
- **Termly development report** — branded per academy, generated from attendance and match data, exportable as PDF and shareable to a parent by WhatsApp link. This is the retention hook: once parents have had three terms of these, leaving means explaining why the reports stopped.
- Player passports issued to every academy player.

---

## 6. Cross-cutting rules

### Money

- Integer kobo everywhere. No floats, no `Number.toFixed` on money, no implicit currency.
- `formatNaira(kobo)` is the only way money reaches the UI.
- Server-side recomputation of every amount before every charge.
- Log every state transition on `payments` and `invoices` with actor and timestamp.

### Data ownership and consent

We say publicly that player records belong jointly to the player and the competition, and that we are the custodian. Build accordingly:

- Guardian consent captured at registration for anyone under 18, stored with a timestamp and the consenting party's details.
- Full data export available to an organisation at any time, self-service.
- A player's record persists when they leave a club or academy — it is theirs.
- Read-only downgrade on non-payment, never deletion.

### Security

- All secrets in environment variables. Nothing in the repo, nothing in the client bundle.
- `PAYSTACK_SECRET_KEY` is server-only — verify it can never leak into a client bundle.
- Rate-limit registration and payment endpoints.
- Recorder accounts get the narrowest possible permissions: append events to assigned fixtures, nothing else.
- Validate and re-encode every uploaded player photo; strip EXIF.

### Testing

- Payment flows, webhook idempotency and signature verification: unit and integration tests, no exceptions.
- Event-log replay determinism: a property test that random event sequences replay to the same state every time.
- Offline sync: a test that queues 50 events offline, syncs three times, and asserts exactly 50 events landed.
- A CI grep test that fails the build if a naira amount appears outside `pricing.ts`.

### Environment variables to add

```
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_URL=
BUSINESS_NAME=
BUSINESS_RC_NUMBER=
BUSINESS_BANK_NAME=
BUSINESS_ACCOUNT_NAME=
BUSINESS_ACCOUNT_NUMBER=
INVOICE_PREFIX=4EV
APP_PUBLIC_URL=https://4ever.buildspecs.io
```

---

## 7. Explicitly do NOT build

Every one of these is a way of avoiding the work that actually earns money:

- Self-serve checkout and pricing pages before the tenth manual deal
- A native mobile app (the PWA is enough, and it ships this month)
- Scouting search, agent marketplace, transfer features
- Fan subscriptions, ads, betting integrations
- In-app chat or social feed
- A design system refactor or a redesign
- Anything AI-flavoured
- Multi-currency or internationalisation

---

## 8. How to work through this

1. Run **Phase 0** and report back. Stop.
2. After I confirm, work **one phase at a time**. Open a branch per phase.
3. Before each phase, restate the plan as a checklist and confirm the schema changes with me — migrations against a live production app are the highest-risk thing here.
4. Every schema change is a reversible migration. Never edit an applied migration.
5. Ship behind a feature flag where the change touches existing live behaviour.
6. At the end of each phase, run the Definition of Done list and paste the results.
7. Keep a running `MONETISATION_PROGRESS.md` with what shipped, what deviated from this brief, and why.

**If anything in this brief conflicts with what you find in the codebase, say so and propose an alternative rather than silently working around it.** The business reasoning behind each requirement is written down above precisely so you can tell me when the reasoning does not survive contact with the code.
