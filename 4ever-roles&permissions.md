# 4everfootball — Roles & Permissions

**This file must be updated whenever a route, `@Roles()`/`@Public()`
decorator, or service-level authorization check (`assertCanManage`,
`assertCanCoach`, ownership check, etc.) changes in `apps/api`.** Treat it
as part of the change, not a follow-up — a permissions doc that drifts from
the code is worse than none, because it's actively misleading. Last
verified against the code: Phase 4 (sponsor reporting + academy
workspace).

## How authorization works here

Every request passes through two global guards in order
(`apps/api/src/app.module.ts`), then optionally a service-level check:

1. **`JwtAuthGuard`** — requires a valid access token, unless the route (or
   its controller) carries `@Public()`, in which case auth is skipped
   entirely. No `@Public()` = must be logged in, full stop, regardless of
   role.
2. **`RolesGuard`** — if the route (or controller) carries `@Roles(...)`,
   the authenticated user's `roles[]` must include at least one listed
   role, or the request is rejected with 403. **No `@Roles()` decorator
   means any authenticated user of any role passes this guard** — the
   route is then only as restricted as whatever the service layer checks
   next.
3. **Service-level checks** (not visible in route decorators, so listed
   explicitly below) — mainly `OrganisationsService.assertCanManage()` /
   `assertCanCoach()`, which check the caller's *membership role within a
   specific organisation*, independent of their platform-wide `Role`.

So a route can be locked down by platform role (`@Roles`), by
organisation-scoped membership (a service call), by both, or — for
anything authenticated with no further check — by neither, in which case
**any logged-in user (including a bare `USER`) can call it.** Several
routes below are in that last category; each is annotated with why that's
the actual intended access, not an oversight.

## Roles

### Platform-wide (`User.roles`, an array — a user can hold several)

| Role | What it's for |
|---|---|
| `SUPER_ADMIN` | Full platform access. Bypasses every organisation-membership check automatically (`assertCanManage`/`assertCanCoach` both short-circuit true for `SUPER_ADMIN`). |
| `ADMIN` | Platform admin — same reach as `SUPER_ADMIN` for almost everything gated by `@Roles()`, but does **not** auto-bypass organisation-membership checks the way `SUPER_ADMIN` does (an `ADMIN` still needs an `OrganisationMember` row to manage a *specific* org, unless also `SUPER_ADMIN`). |
| `SCOUT` | Can record match events (`POST /fixtures/:id/events`) and fixture attendance. **Global, not scoped to specific fixtures or organisations** — see Finding S-4 below; this is the literal "recorder" role the brief describes, but it doesn't yet match the brief's "assigned fixtures, nothing else" model. |
| `EDITOR` | Content curation: news articles, media library, player outcomes (trials/call-ups/signings). |
| `USER` | Default role on registration. No `@Roles()`-gated route lists `USER` explicitly — a plain `USER` reaches only `@Public()` routes and the handful of authenticated-no-further-check routes below (e.g. creating their own organisation). |

### Organisation-scoped (`OrganisationMember.role`, one per user per organisation)

| Role | What it's for |
|---|---|
| `OWNER` | Full control of one organisation. Passes both `assertCanManage` and `assertCanCoach`. |
| `ADMIN` | Same as `OWNER` for this codebase's purposes — every check that accepts `OWNER` also accepts organisation-`ADMIN` (`MANAGE_ROLES = ['OWNER','ADMIN']`). |
| `COACH` | Passes `assertCanCoach` only (academy attendance, enrollment, termly reports) — **not** `assertCanManage` (age-group creation, team assignment, subscriptions, member management, invoices, payments). Added in Phase 4 specifically so a coach isn't locked out of their day-to-day task. |
| `RECORDER` | **Defined in the schema but not read by any permission check in the code.** A `RECORDER` member today has identical access to a non-member — zero. See Finding S-4. |
| `VIEWER` | **Same as `RECORDER` — defined, never checked anywhere.** See Finding S-4. |

## Access tier legend used in the tables below

- **Public** — `@Public()`. No login required.
- **Any authenticated** — no `@Public()`, no `@Roles()`. Any logged-in user, any role, passes the route guards; check the "Effective restriction" column for whatever the service layer enforces underneath.
- **`ROLE_A`, `ROLE_B`** — `@Roles('ROLE_A','ROLE_B')`. Must be logged in AND hold at least one listed platform role.
- **assertCanManage(org)** — service-level check: caller must be `SUPER_ADMIN`, or an `OWNER`/`ADMIN` member of the organisation identified by the route/body.
- **assertCanCoach(org)** — service-level check: caller must be `SUPER_ADMIN`, or an `OWNER`/`ADMIN`/`COACH` member of the organisation.

---

## Auth (`/auth`) — all public by design

| Method & path | Access | Notes |
|---|---|---|
| `POST /auth/register` | Public | Creates a `USER` |
| `POST /auth/login` | Public | |
| `POST /auth/refresh` | Public | Reads the `refresh_token` httpOnly cookie itself |
| `POST /auth/logout` | Public | |

## Users (`/users`)

| Method & path | Access | Notes |
|---|---|---|
| `GET /users/me` | Any authenticated | Own profile only |
| `GET /users/admin/all` | `SUPER_ADMIN`, `ADMIN` | |
| `PATCH /users/:id/roles` | `SUPER_ADMIN`, `ADMIN` | Grants/revokes platform `Role`s |

## Teams (`/teams`)

| Method & path | Access |
|---|---|
| `GET /teams` | Public |
| `GET /teams/admin/all` | `SUPER_ADMIN`, `ADMIN` |
| `GET /teams/:slug` | Public |
| `POST /teams` | `SUPER_ADMIN`, `ADMIN` |
| `PATCH /teams/:id` | `SUPER_ADMIN`, `ADMIN` |
| `DELETE /teams/:id` | `SUPER_ADMIN`, `ADMIN` |

## Players (`/players`)

| Method & path | Access |
|---|---|
| `GET /players` | Public |
| `GET /players/admin/all` | `SUPER_ADMIN`, `ADMIN` |
| `GET /players/:slug` | Public |
| `GET /players/:slug/stats` | Public |
| `POST /players` | `SUPER_ADMIN`, `ADMIN` |
| `PATCH /players/:id` | `SUPER_ADMIN`, `ADMIN` |
| `DELETE /players/:id` | `SUPER_ADMIN`, `ADMIN` |
| `GET /players/:playerId/outcomes` | Public | Trials/call-ups/signings — treated as credibility content, same as news |
| `POST /players/:playerId/outcomes` | `SUPER_ADMIN`, `ADMIN`, `EDITOR` | Requires a mandatory `sourceNote` citation |
| `DELETE /player-outcomes/:id` | `SUPER_ADMIN`, `ADMIN`, `EDITOR` | |
| `POST /players/:playerId/passport` | Public | Get-or-create the ungated passport graphic — no auth at all, deliberately (the "acquisition loop"); see Finding S-5 |

## Competitions (`/competitions`)

| Method & path | Access | Notes |
|---|---|---|
| `GET /competitions` | Public | |
| `GET /competitions/admin/all` | `SUPER_ADMIN`, `ADMIN` | |
| `GET /competitions/:slug` | Public | Increments `pageViewCount` |
| `POST /competitions` | `SUPER_ADMIN`, `ADMIN` | Not organisation-scoped — any platform admin creates for any org (`organisationId` optional, defaults to the legacy org) |
| `PATCH /competitions/:id` | `SUPER_ADMIN`, `ADMIN` | Includes the custom-slug field; slug uniqueness checked in the service |
| `PATCH /competitions/:id/tier` | `SUPER_ADMIN`, `ADMIN` | Added for MONETISATION_UI_BRIEF.md §5 A2/A3 — separate from the general update so a tier change stays a deliberate action; `POST /payments/initialize` prices the licence strictly off this field, server-side |
| `DELETE /competitions/:id` | `SUPER_ADMIN`, `ADMIN` | |
| `GET /competitions/:id/teams` | Public | |
| `POST /competitions/:id/teams` | `SUPER_ADMIN`, `ADMIN` | |
| `DELETE /competitions/:id/teams/:teamId` | `SUPER_ADMIN`, `ADMIN` | |
| `GET /competitions/:competitionId/table` | Public | |
| `GET /competitions/:competitionId/form` | Public | |
| `GET /competitions/:id/top-scorers` | Public | |
| `GET /competitions/:id/top-assists` | Public | |
| `GET /competitions/:slug/sponsor-dashboard` | Public | Deliberately ungated — marketing collateral for the sponsor page, distinct from the paid Impact Report below |
| `GET /competitions/:competitionId/graphics` | Any authenticated → **assertCanManage(competition's org)** | |
| `GET /competitions/:competitionId/impact-report/json` | Any authenticated → **assertCanManage + SponsorEntitlement('IMPACT_REPORT')** | Two checks: org membership AND a paid/granted entitlement |
| `GET /competitions/:competitionId/impact-report/csv` | Same as above | |
| `POST /competitions/:competitionId/impact-report/pdf` | Same as above | |

## Fixtures (`/fixtures`)

| Method & path | Access |
|---|---|
| `GET /fixtures` | Public |
| `GET /fixtures/:id` | Public |
| `POST /fixtures` | `SUPER_ADMIN`, `ADMIN` |
| `PATCH /fixtures/:id` | `SUPER_ADMIN`, `ADMIN` |
| `PATCH /fixtures/:id/attendance` | `SUPER_ADMIN`, `ADMIN`, `SCOUT` |
| `DELETE /fixtures/:id` | `SUPER_ADMIN`, `ADMIN` |
| `GET /fixtures/:fixtureId/events` | Public |
| `GET /fixtures/:fixtureId/live-state` | Public |
| `GET /fixtures/:fixtureId/verify` | Public | Deliberately public — a "verified record" badge for a skeptical organiser, not an internal debug route |
| `POST /fixtures/:fixtureId/events` | `SUPER_ADMIN`, `ADMIN`, `SCOUT` | **Not scoped to a specific fixture, competition, or organisation — any `SCOUT` can record events on any fixture platform-wide.** See Finding S-4 |

## Standings (`/competitions/:competitionId/table`, `/form`) — see Competitions above

## Stats (`/competitions/:id/top-scorers`, `/top-assists`, `/players/:slug/stats`) — see above, all public

## News (`/news`)

| Method & path | Access |
|---|---|
| `GET /news` | Public |
| `GET /news/admin/all` | `SUPER_ADMIN`, `ADMIN`, `EDITOR` |
| `GET /news/:slug` | Public |
| `POST /news` | `SUPER_ADMIN`, `ADMIN`, `EDITOR` |
| `PATCH /news/:id` | `SUPER_ADMIN`, `ADMIN`, `EDITOR` |
| `DELETE /news/:id` | `SUPER_ADMIN`, `ADMIN`, `EDITOR` |

## Dashboard (`/dashboard`)

| Method & path | Access |
|---|---|
| `GET /dashboard/summary` | `SUPER_ADMIN`, `ADMIN` |

## Media (`/media`) — class-level `@Roles`, applies to every route below

| Method & path | Access | Notes |
|---|---|---|
| `GET /media` | `SUPER_ADMIN`, `ADMIN`, `EDITOR` | |
| `POST /media/upload-url` | `SUPER_ADMIN`, `ADMIN`, `EDITOR` | Presigned S3 PUT URL — **no server-side image processing** (see Finding S-6) |
| `POST /media` | `SUPER_ADMIN`, `ADMIN`, `EDITOR` | Confirms an upload already sent to S3 |
| `DELETE /media/:id` | `SUPER_ADMIN`, `ADMIN`, `EDITOR` | |

## Search (`/search`)

| Method & path | Access |
|---|---|
| `GET /search` | Public |
| `POST /search/reindex` | `SUPER_ADMIN`, `ADMIN` |

## Health (`/health`)

| Method & path | Access |
|---|---|
| `GET /health` | Public |

## Organisations (`/organisations`)

| Method & path | Access | Notes |
|---|---|---|
| `POST /organisations` | Any authenticated | Anyone can found an organisation — nothing to be a member of yet |
| `GET /organisations/mine` | Any authenticated | Own memberships only |
| `GET /organisations/admin/all` | `SUPER_ADMIN`, `ADMIN` | Added for MONETISATION_UI_BRIEF.md §5 A1 — previously nothing could list all organisations at all, only "mine" or a single one by id |
| `GET /organisations/:id` | `SUPER_ADMIN`, `ADMIN` | Platform-role gate, not org-scoped — unlike almost everything else in this section |
| `GET /organisations/:id/members` | Any authenticated → **assertCanManage(org)** | Added for §5 A1 — previously the members list existed only as a write target (`POST .../members`), never readable |
| `POST /organisations/:id/members` | Any authenticated → **assertCanManage(org)** | Adds a member of any `OrganisationMemberRole`, including `COACH` |

## Payments (`/payments`)

| Method & path | Access | Notes |
|---|---|---|
| `POST /payments/initialize` | Any authenticated → **assertCanManage(org)** | Licence payments only. `amountKobo` always server-computed from `pricing.ts`, never client-supplied. `provider` now optional (defaults `PAYSTACK`) — previously hardcoded, so `BANK_TRANSFER` couldn't be selected for a licence at all |
| `GET /payments/bank-details` | Any authenticated | Added for §5 A3 — surfaces the `BUSINESS_BANK_NAME`/`BUSINESS_ACCOUNT_NAME`/`BUSINESS_ACCOUNT_NUMBER` env vars, which nothing read before this |
| `GET /payments/:id` | Any authenticated → **assertCanManage(payment's org)** | Added for §5 A3/D1 — this controller had no GET routes at all before, so there was no way to read a payment's status back |
| `POST /payments/webhook` | Public | Paystack calls this; HMAC signature verification *is* the authentication |
| `POST /payments/:id/verify` | Any authenticated | **No ownership check** — any logged-in user can poll any payment's status by ID. Low severity (read-only, no amount disclosed beyond status) but inconsistent with every other payment/invoice route requiring `assertCanManage` |
| `POST /payments/:id/confirm-transfer` | `SUPER_ADMIN`, `ADMIN` | Bank-transfer/cash confirmation — platform-role gated, not org-scoped (any platform admin can confirm any organisation's transfer) |

## Player registrations (`/competitions/:competitionId/registrations`)

| Method & path | Access | Notes |
|---|---|---|
| `GET /competitions/:competitionId/registrations` | Any authenticated → **assertCanManage(competition's org)** | Added for §5 A4/B4/B5/B6 — previously this module could only write registrations, never list them back. Optional `?teamId=` narrows to one club's squad |
| `POST /competitions/:competitionId/registrations` | Any authenticated → **assertCanManage(player's team's org)** | |
| `POST /competitions/:competitionId/registrations/checkout` | Any authenticated → **assertCanManage(org)** | `amountKobo` always summed server-side from stored `priceKobo` snapshots |

## Invoices (`/invoices`)

| Method & path | Access | Notes |
|---|---|---|
| `POST /invoices` | `SUPER_ADMIN`, `ADMIN` + **assertCanManage(org)** | Line-item `unitKobo` is admin-entered (custom/negotiated deals), not pulled from `pricing.ts` — a deliberate exception, not a bypass: only trusted staff reach this route, and the *total* is still always server-derived from the entered lines, never client-supplied directly |
| `GET /invoices/organisation/:organisationId` | Any authenticated → **assertCanManage(org)** | |
| `GET /invoices/:id` | Any authenticated → **assertCanManage(invoice's org)** | |
| `POST /invoices/:id/issue` | `SUPER_ADMIN`, `ADMIN` + **assertCanManage(org)** | |
| `POST /invoices/:id/cancel` | `SUPER_ADMIN`, `ADMIN` + **assertCanManage(org)** | |
| `POST /invoices/:id/record-payment` | `SUPER_ADMIN`, `ADMIN` + **assertCanManage(org)** | |

## Media packs (`/media-packs`)

| Method & path | Access |
|---|---|
| `POST /media-packs/purchase` | Any authenticated → **assertCanManage(org)** |

## Sponsor entitlements (`/sponsor-entitlements`)

| Method & path | Access | Notes |
|---|---|---|
| `POST /sponsor-entitlements` | `SUPER_ADMIN`, `ADMIN` | **Platform-admin only, not the organisation's own admin** — this is the internal record of a manual sales deal closing (brief §7: no self-serve checkout), so an organisation cannot grant this to itself |

## Graphics (`/organisations/:id/graphics`, `/competitions/:id/graphics`, `/graphics/:id`, `/players/:id/passport`)

| Method & path | Access | Notes |
|---|---|---|
| `GET /organisations/:organisationId/graphics` | Any authenticated → **assertCanManage(org)** | |
| `GET /competitions/:competitionId/graphics` | Any authenticated → **assertCanManage(competition's org)** | |
| `GET /graphics/:id` | Public | Deliberate — a passport recipient with no account needs to poll status |
| `GET /graphics/:id/share/whatsapp` | Public | Same reasoning; see Finding S-5 on abuse potential |
| `POST /players/:playerId/passport` | Public | Ungated by design (brief §4: "the acquisition loop") |

## Academy (`/organisations/:organisationId/academy/...`)

| Method & path | Access | Notes |
|---|---|---|
| `GET .../academy/age-groups` | **assertCanCoach(org)** | |
| `POST .../academy/age-groups` | **assertCanManage(org)** | |
| `POST .../academy/age-groups/:ageGroupId/team` | **assertCanManage(org)** | |
| `POST .../academy/age-groups/:ageGroupId/players/:playerId/enroll` | **assertCanCoach(org)** | Triggers the ungated `PLAYER_PASSPORT` graphic |
| `POST .../academy/attendance` | **assertCanCoach(org)** | The "four taps" action itself |
| `GET .../academy/attendance/:ageGroupId` | **assertCanCoach(org)** | |
| `GET .../academy/subscription` | **assertCanManage(org)** | |
| `POST .../academy/subscription` | **assertCanManage(org)** | Never touches `PaymentsService` — invoice-only, no card billing path exists to gate |
| `POST .../academy/age-groups/:ageGroupId/players/:playerId/termly-report` | **assertCanCoach(org)** | |

---

## Known findings — access-control gaps (not yet fixed; see the audit in chat/commit history for the fix plan)

- **S-4**: `RECORDER`/`VIEWER` `OrganisationMemberRole` values are defined but never checked anywhere. Match-event and fixture-attendance recording are gated by the *global* `SCOUT` platform role instead, with no per-fixture or per-organisation scoping — a `SCOUT` can record events for any fixture platform-wide, not "assigned fixtures" as the brief specifies.
- **S-5**: Several graphics/passport routes are intentionally `@Public()` with no rate limiting beyond the app-wide default (100 req/60s per IP). An anonymous caller can trigger unlimited passport-generation/render jobs for arbitrary player IDs.
- **S-6**: `POST /media/upload-url` has no server-side image processing at all — no re-encoding, no EXIF stripping — despite being the path player photos go through.
- Payments/invoices have no per-transition audit trail beyond the current `status` + `updatedAt` — see the money audit for detail.
