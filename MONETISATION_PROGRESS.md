# Monetisation build — progress log

Tracks what shipped against `MONETISATION_BUILD_BRIEF.md`, what deviated from
the brief, and why. Updated at the end of each phase per the brief's own
ground rules (§8).

All phases so far have been executed on a single branch (`phase-1-event-log`),
not one branch per phase as §8.2 specifies — an explicit, standing
instruction from the user overriding that default.

---

## Phase 0 — Discovery

Completed prior to this log's creation. No record kept here; see chat history.

## Phase 1 — Immutable event log + offline capture

Shipped: append-only `match_events` table with a SHA-256 hash chain
(`prevHash`/`hash` per row), row-locked concurrent-writer serialization,
`CORRECTION` events as the only way to amend history (never UPDATE/DELETE),
a `/fixtures/:id/verify` endpoint that replays and re-verifies the chain,
and an `AutoKickoffService` (`@nestjs/schedule` `@Interval`) precedent for
background jobs.

Committed as `81ea3cb feat: implement append-only event log with immutability
guarantees`.

## Phase 2 — The money path

Shipped: `Organisation`/`OrganisationMember` multi-tenancy (with every
pre-existing record backfilled onto a seeded "Legacy / Unassigned" org),
`pricing.ts` as the single source of truth for every kobo amount, entitlement
checks (free-tier caps, "upgrade quote not hard block"), full Paystack
integration (HMAC-SHA512 webhook verification, idempotent `fulfilPayment()`
shared by webhook and bank-transfer paths, a reconciliation poller),
per-player `PlayerRegistration` records with guardian consent for minors, an
eligibility gate wired into `MatchEventsService.recordEvent()`, and
`InvoicesModule` (sequential quote numbers, 50/50 deposit/balance milestones,
no PDF rendering).

**Deviations flagged at the time:**
- `OrganisationType` gained a `CLUB` value the brief's enum didn't list —
  needed so a club paying for player registrations has an organisation to
  hang payments off of.
- No real job queue exists in this repo — payment reconciliation reuses
  Phase 1's `@Interval` precedent instead of introducing BullMQ/Redis.
- PDF invoice rendering deferred entirely (not attempted).

Committed as `e9bcb46 feat(payments): implement Paystack payment integration
with webhook handling`.

## Phase 3 — The media engine

**Architecture:** Satori → SVG → `@resvg/resvg-js` → PNG, rendered
server-side in `apps/api` (not Next.js `ImageResponse`) — the DoD requires a
goal to produce a shareable image within 60s of the event, which means
generation has to be triggered by the data mutation, not lazily rendered on
first pageview. Fonts/palette are the existing Floodlight brand identity
(`apps/mobile/src/theme/floodlight.ts`, itself ported from `apps/web`'s
CSS) — Big Shoulders Display + IBM Plex Sans/Mono, copied into
`apps/api/src/modules/graphics/assets/fonts` as static assets so this module
has no runtime dependency on another app's `node_modules` layout.

**Pipeline:** `Graphic` table (`PENDING`/`PROCESSING`/`READY`/`FAILED`),
`GraphicsService.enqueue()` does the entitlement check + a dedup check + one
fast INSERT (a snapshot of the render data, not yet including images),
`GraphicsWorkerService` (`@Interval`, 5s poll, batch of 5, max 3 attempts)
does the actual work: `ImageEmbedService.prepare()` fetches any `*Url` field
in the snapshot and injects a sibling `*DataUri` field (falling back to an
initials badge on any fetch failure — never a failed render), then
`SatoriRendererService` renders and `S3StorageService.putObject()` uploads.
All 10 templates implemented (`domain/templates/*.ts`), hyperscript-based
(no JSX/React dependency added to `apps/api`).

**Deviations flagged before writing code, confirmed with the user:**
1. **No job queue** — same `@Interval` substitute as Phase 2's payment
   reconciliation, for the same reason (none exists in this repo).
2. **No CDN** — graphics serve through the same direct S3/MinIO public URL
   every other asset in this codebase already uses; standing up a real CDN
   is an infra/deployment task, not app code.
3. **"League table — end of each round" / "Season summary — final
   matchday"** — this schema has no `round`/`matchday` concept (fixtures
   just carry a date). Read as "the last fixture scheduled for this
   competition on this calendar day just finished" and "no fixtures remain
   SCHEDULED/LIVE anywhere in this competition," respectively, both computed
   from existing fixture data.

**A real circular-dependency risk found and resolved while wiring modules:**
`StatsModule` imports `MatchesModule`. The natural design — one
`GraphicsModule` containing both the core render pipeline and the
calendar-driven triggers (which need `StatsService`/`StandingsService`) —
would have made `GraphicsModule` transitively depend on `MatchesModule`,
which itself needs to import `GraphicsModule` for its GOAL/FULL_TIME hooks.
Split into a core `GraphicsModule` (no Stats/Standings dependency, safe for
`MatchesModule`/`PlayerRegistrationsModule` to import) and a separate
`GraphicsTriggersModule` (imports `GraphicsModule` + `StandingsModule` +
`StatsModule`, imported only by `AppModule`, nothing imports it back).

**Other gaps closed along the way (not scope creep — required for the
schema/module changes already in flight to actually compile/run):**
- `StatsModule` didn't export `StatsService` — fixed.
- Milestone thresholds are a small fixed ladder (player goals: 10/25/50/
  100/200/300/500; platform registrations: 100/500/1k/5k/10k/50k), not
  every-Nth — matches the brief's own examples ("100th goal, 500th player")
  and keeps milestones rare/celebratory rather than firing constantly.
- The platform-wide player milestone counts total `PlayerRegistration` rows
  (any status), not just `CONFIRMED`/paid ones — counting only confirmed
  registrations would require the hook to live inside
  `PaymentsService.fulfilPayment()`, which would need `PaymentsModule` to
  import `GraphicsModule`; `GraphicsModule` already imports
  `PaymentsModule` transitively (via `MediaPacksModule`), so that would
  close a cycle. Hooking `PlayerRegistrationsService.register()` (the
  DRAFT-creation step) instead avoids it and also happens to match the
  brief's "Player passport card — on registration" wording more literally
  than a payment-confirmation trigger would.

**Explicitly out of scope for this pass:**
- The actual admin "download every graphic for their team" **screen** and
  the passport **one-tap share button** are apps/web/mobile UI — this
  execution only built the API surface (list/passport/share-link
  endpoints), same boundary Phase 2 drew around the Paystack checkout UI.
- Competition branding colours (`primaryColor`/`secondaryColor`/
  `sponsorLogoUrl`) are settable via the existing admin competition
  create/update endpoints but have no dedicated admin UI either.

## Phase 4 — Sponsor reporting and academy workspace

Two largely independent subsystems, both shipped: `SponsorshipModule`
(§5.1 — sponsor dashboard, impact reports, player outcomes) and
`AcademyModule` (§5.2 — age groups, coach accounts, attendance,
subscriptions, termly reports).

**PDF library:** `pdfkit`, chosen over Satori (fixed-canvas images, not a
fit for a multi-page paginated document) and Puppeteer (same "no headless
Chromium" reasoning as Phase 3). A real bug surfaced during a smoke test:
`fontkit` (pdfkit's font parser) throws `Offset is outside the bounds of
the DataView` on the IBM Plex Mono TTF — confirmed across every weight —
even though Satori's own parser handles the identical file fine. Space
Mono substitutes for the mono face in PDFs only; not an arbitrary swap,
it's the mono face `apps/mobile`'s *other* existing brand identity
("Fourth Official," the scout-tool theme) already uses. A second real bug,
also caught by smoke-testing before building on top of it: the first
`statGrid()`/`table()` implementation relied on pdfkit's implicit text
cursor advancing predictably across manual grid columns/rows — it doesn't,
and the rendered output visibly overlapped text across cells. Rewritten to
compute every cell's (x, y) explicitly from its row/column index.

**Deviations flagged before writing code, confirmed with the user:**
1. **"Digital reach" / page views** — no analytics infrastructure exists
   anywhere in this codebase. `Competition.pageViewCount` increments on
   every `getBySlug()` call — a real counter, but it measures API calls to
   the public endpoint, not unique client-side page loads.
2. **"Graphics shared"** — `Graphic.shareCount` increments when the
   WhatsApp share *link* is requested, not on a confirmed share, since the
   native share sheet is a client-side action invisible to this API.
3. **"Matches verified"** — cached (`Fixture.chainVerified`/`verifiedAt`),
   computed once at the same `FULL_TIME` hook Phase 3 added, rather than
   re-replaying every fixture's hash chain on every dashboard load.
4. **No self-serve checkout for the Impact Report** — §7 explicitly lists
   "self-serve checkout and pricing pages before the tenth manual deal" as
   something not to build. Unlike Phase 3's Media Pack (small, appropriate
   for self-serve), `SponsorEntitlement` is admin-*granted* after a manual
   deal closes — no `sourcePayment` FK at all, unlike `MediaPackEntitlement`.
5. **No stored "Term" entity** for the termly development report — the
   caller supplies an explicit date range; inventing a calendar concept
   this schema has no other use for felt like the wrong trade.
6. **Academy plan billing is invoice-only** — reuses Phase 2's
   `InvoicesModule` (with the 20% `ANNUAL_PREPAY_DISCOUNT`, unused in
   `pricing.ts` since the phase that defined it). "No monthly card
   billing" is enforced structurally: `AcademySubscriptionsService` never
   injects `PaymentsService`/`PaystackClientService` at all, so there is no
   code path to a card charge.

**Two real gaps found in already-shipped Phase 2 code, closed along the
way (not scope creep — needed for Phase 4's own features to work):**
- `OrganisationsService.addMember()` has existed since Phase 2 but was
  never wired to a controller route — no member of any role (including
  this phase's new `COACH`) could be added via the API at all. Added
  `POST /organisations/:id/members`.
- `assertCanManage()` only allows `OWNER`/`ADMIN`. Attendance recording —
  a coach's actual day-to-day task — would have locked every coach out
  entirely. Added a parallel `assertCanCoach()` (`OWNER`/`ADMIN`/`COACH`),
  used for attendance and enrollment; admin-tier actions (age-group
  creation, team assignment, subscription purchase) still require
  `assertCanManage()`.

**A design call worth surfacing:** the platform-wide player milestone
(Phase 3) and academy player passports both needed a graphics hook;
academy enrolment reuses the *same* ungated `PLAYER_PASSPORT` template
Phase 3 built for competition registration rather than a second one —
brief §5.2 asks for "player passports issued to every academy player,"
not a visually distinct academy passport.

**Explicitly out of scope for this pass:** every report/dashboard's
frontend UI (same API-only boundary as every prior phase); a
"round"/"term"/"session" calendar model beyond the caller-supplied date
ranges described above.
