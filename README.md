# 4EverFootball

Monorepo (pnpm workspaces): `apps/api` (NestJS + Prisma + PostgreSQL), `apps/web` (Next.js), `packages/shared` (types shared across both).

## Setup

```bash
pnpm install
pnpm --filter @4ef/shared build   # @4ef/shared ships compiled dist, not raw TS — rerun after editing packages/shared/src
cp apps/api/.env.example apps/api/.env    # fill in JWT secrets
cp apps/web/.env.example apps/web/.env.local
docker compose up -d postgres redis meilisearch minio minio-init
pnpm --filter @4ef/api exec prisma migrate dev
```

## Run (local, outside Docker)

```bash
pnpm dev:api    # http://localhost:4000  (Swagger docs at /docs)
pnpm dev:web    # http://localhost:3000
```

## Run (fully dockerized)

`docker-compose.yml` also builds the API and web app themselves (via
`apps/api/Dockerfile` / `apps/web/Dockerfile`, both pnpm-workspace-aware
multi-stage builds), so the whole stack can run without a local Node install.
Requires `apps/api/.env` to exist first (copy from `apps/api/.env.example` and
fill in JWT secrets — its localhost-based defaults for S3/Meilisearch/DB are
correct for this path, they get overridden with in-network hostnames only
where the `api` container itself needs to reach another container):

```bash
docker compose up -d --build
```

- API: http://localhost:4000 (Swagger at `/docs`), web: http://localhost:3000.
- Migrations run automatically before `api` starts (`api-migrate` is a real
  dependency with `condition: service_completed_successfully`, gated on
  `postgres`'s healthcheck) — no manual `docker compose run` step needed for
  a normal `up`. Re-run it by hand any time with
  `docker compose run --rm api-migrate`.
- `prisma-studio` runs alongside on its default port, http://localhost:5555,
  pointed at the same `postgres` container — useful for inspecting/seeding
  data without leaving the Docker stack.
- `api-migrate`/`prisma-studio` target the pre-pruned build stage (the `api`
  service's own image drops `devDependencies`, including the `prisma` CLI,
  via `pnpm deploy --prod`), so they're the ones to run for migrations/studio
  rather than `docker compose exec api ...`.
- Payment paths (Paystack init/verify/webhook) need real test keys added to
  `apps/api/.env`'s `PAYSTACK_*` vars to manually exercise — every other
  route works with the `.env.example` defaults.
- `nginx`/`certbot` (the public-testing reverse proxy) are excluded from a
  plain `docker compose up` — they reference TLS certs that don't exist on a
  fresh local clone. For a public-testing deploy behind a real domain, use
  `docker compose -f docker-compose.yml -f docker-compose.public.yml --profile public up -d --build`
  (see `docker-compose.public.yml`'s header comment for what it overrides),
  plus the one-time certbot bootstrap in `infrastructure/nginx/README.md` —
  separate from the Terraform/ECS path in `infrastructure/README.md`.

## Status

- Auth (register/login/refresh/logout, JWT + rotating refresh tokens, RBAC guards) and user profile.
- Teams (CRUD, public listing/detail with search + pagination, admin management UI).
- Players (CRUD, team assignment, public listing/detail with search + position filter, squad shown on team detail, admin management UI).
- Competitions (CRUD, team entries via a competition_entries join table, public listing/detail showing entered teams, admin management UI with an add/remove-teams dialog).
- Fixtures (CRUD scheduling matches between two teams entered in a competition, status lifecycle + scores, public listing/detail, fixtures shown on team and competition detail pages, admin management UI).
- League Tables (standings computed on the fly from FINISHED fixtures — no persisted table, just an aggregation over Competitions + Fixtures — shown on the competition detail page).
- Live Match Engine + Scout Live Engine: event-sourced `MatchEvent` log (goal, cards, subs, VAR, etc. — 19 types) is the sole source of truth; `Fixture.homeScore/awayScore` and `status` (LIVE/FINISHED) are recomputed transactionally from the event log on every write, never hand-edited. Real-time delivery via a push-only Socket.IO channel (`/live`, room-per-fixture). Scout recording UI (`/scout/fixtures/:id`, role-gated) records offline-tolerant via a localStorage-backed retry queue keyed by a client-generated idempotency UUID, so a dropped connection never loses or duplicates a tap. Public fixture pages update live without a refresh.
- Match Statistics: top scorers/assists per competition and career player stats (goals/assists/cards/appearances), all computed on read from the event log (same no-persisted-counters pattern as League Tables). Team form (`W`/`D`/`L`) shown as a column on the standings table.
- News (draft/published articles with tags and an optional cover image URL, author attribution, public listing/detail, admin management UI gated to EDITOR/ADMIN/SUPER_ADMIN).
- Admin Dashboard: a unified `/admin` shell with a role-filtered sidebar (previously the admin pages were only reachable one-by-one via a header dropdown). Dashboard home shows platform-wide stat totals plus live/upcoming fixtures. Also added: admin user management (`/admin/users`) — list users, edit roles/active status, with a privilege-escalation guard (only a super admin can grant/revoke the super admin role; nobody can edit their own roles) — this closes a real gap, since until now there was no way for anyone to actually assign the SCOUT/EDITOR/ADMIN roles that the RBAC system and every role-gated feature so far have depended on. Also added a Live Scouting hub (`/admin/scouting`) surfacing live/upcoming fixtures for scouts.
- Media: S3-compatible file library (MinIO locally; swapping to real S3/R2/Spaces in production is an env-var change, no code change) via presigned-URL uploads — the browser uploads bytes directly to storage, never through our API. A reusable upload component is wired into the Team and News forms (replacing plain "paste a URL" fields), plus a standalone media library at `/admin/media`.
- Search: Meilisearch indexes Teams, Players, Competitions, and published News. Each of those services pushes index updates on create/update/delete (deactivated/unpublished/deleted records are removed from the index); a Meilisearch outage is logged and swallowed, never fails the underlying write. A search bar in the header and a `/search` results page query all four indexes in parallel; `/admin` has a "Reindex search" action to rebuild the indexes from Postgres.
- Dockerized deployment: `apps/api/Dockerfile` and `apps/web/Dockerfile` are multi-stage, pnpm-workspace-aware builds; `docker-compose.yml` now also runs `api`, `web`, a one-shot `api-migrate`, and `prisma-studio` (default port 5555) alongside the existing infra services — see the README's "Run (fully dockerized)" section. AWS infrastructure lives in `infrastructure/` (Terraform: VPC, RDS, ElastiCache, S3, ECR, two ALBs, ECS Fargate services, Secrets Manager) with its own runbook at `infrastructure/README.md`; Meilisearch runs on Meilisearch Cloud rather than self-hosted AWS compute.
- Live Scores (`/live`, public): a self-updating hub with three sections — matches currently LIVE (running score + a client-computed elapsed-minute clock), matches that just concluded (FINISHED within the last 3 hours), and matches kicking off in the next 24 hours — all sorted chronologically. Fixtures now start themselves — a `@nestjs/schedule` interval job (`AutoKickoffService`, every 30s) finds SCHEDULED fixtures whose kickoff time has arrived and records a system-generated `KICKOFF` event through the same `MatchEventsService.recordEvent()` path a scout's tap goes through (deterministic `clientEventId` keeps it idempotent), so the event log stays the single source of truth — no new mutation path, and match *ending* is still scout-controlled on purpose. Live rows subscribe to the existing per-fixture Socket.IO room via a lighter-weight `useLiveFixtureState` hook (state-only, skips the full event timeline); clicking through to `/fixtures/:id` reaches the existing full scout-engine-powered detail page unchanged. (Also fixed along the way: the scout event-recording queue was sending a local-only `queuedAt` bookkeeping field in the request body, which the API's strict DTO whitelist silently rejected on every single event — every scout-recorded event now actually reaches the server and the live pages it feeds.)

- Visual identity — "Floodlight": purple/black/white, picked from two full pitches (published as a design artifact) grounded in floodlit night-match energy rather than generic tech-purple. Applied as a single committed dark theme (no light/dark toggle — the violet-black ground *is* the brand) across every public page: Big Shoulders Display / IBM Plex Sans / IBM Plex Mono type system, a diagonal floodlight-glow hero on the home page, a `Wordmark`/`Container`/`EntityImage` component set reused across all list and detail pages (team/player/competition logos and photos now actually render, via `next/image` against MinIO/S3), a `Sheet`-based mobile nav fixing a header that previously had no responsive handling at all, `Skeleton` loading states, and a branded favicon/app-icon. `/admin/*` was left untouched by design and inherited the same tokens automatically with no extra work, since it has no separate theme namespace in active use.

Everything else in the MVP scope (Public Website) is not yet implemented — everything else is really about polish/assembly of what already exists rather than a new module.
