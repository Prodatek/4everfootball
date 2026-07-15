# 4EverFootball

Monorepo (pnpm workspaces): `apps/api` (NestJS + Prisma + PostgreSQL), `apps/web` (Next.js), `packages/shared` (types shared across both).

## Setup

```bash
pnpm install
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
multi-stage builds), so the whole stack can run without a local Node install:

```bash
docker compose up -d --build
docker compose run --rm api-migrate   # applies Prisma migrations, one-shot
```

- API: http://localhost:4000, web: http://localhost:3000.
- `prisma-studio` runs alongside on its default port, http://localhost:5555,
  pointed at the same `postgres` container — useful for inspecting/seeding
  data without leaving the Docker stack.
- `api-migrate` targets the pre-pruned build stage (the `api` service's own
  image drops `devDependencies`, including the `prisma` CLI, via
  `pnpm deploy --prod`), so it's the one to run for migrations rather than
  `docker compose exec api ...`.

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
- Live Scores (`/live`, public): a self-updating hub of matches currently LIVE (running score + a client-computed elapsed-minute clock) and matches kicking off in the next 24 hours, sorted chronologically. Fixtures now start themselves — a `@nestjs/schedule` interval job (`AutoKickoffService`, every 30s) finds SCHEDULED fixtures whose kickoff time has arrived and records a system-generated `KICKOFF` event through the same `MatchEventsService.recordEvent()` path a scout's tap goes through (deterministic `clientEventId` keeps it idempotent), so the event log stays the single source of truth — no new mutation path, and match *ending* is still scout-controlled on purpose. Live rows subscribe to the existing per-fixture Socket.IO room via a new lighter-weight `useLiveFixtureState` hook (state-only, skips the full event timeline); clicking through to `/fixtures/:id` reaches the existing full scout-engine-powered detail page unchanged.

Everything else in the MVP scope (Public Website) is not yet implemented — everything else is really about polish/assembly of what already exists rather than a new module.
