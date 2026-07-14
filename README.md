# 4EverFootball

Monorepo (pnpm workspaces): `apps/api` (NestJS + Prisma + PostgreSQL), `apps/web` (Next.js), `packages/shared` (types shared across both).

## Setup

```bash
pnpm install
cp apps/api/.env.example apps/api/.env    # fill in JWT secrets
cp apps/web/.env.example apps/web/.env.local
docker compose up -d                      # postgres, redis, meilisearch
pnpm --filter @4ef/api exec prisma migrate dev
```

## Run

```bash
pnpm dev:api    # http://localhost:4000  (Swagger docs at /docs)
pnpm dev:web    # http://localhost:3000
```

## Status

- Auth (register/login/refresh/logout, JWT + rotating refresh tokens, RBAC guards) and user profile.
- Teams (CRUD, public listing/detail with search + pagination, admin management UI).
- Players (CRUD, team assignment, public listing/detail with search + position filter, squad shown on team detail, admin management UI).
- Competitions (CRUD, team entries via a competition_entries join table, public listing/detail showing entered teams, admin management UI with an add/remove-teams dialog).
- Fixtures (CRUD scheduling matches between two teams entered in a competition, status lifecycle + scores, public listing/detail, fixtures shown on team and competition detail pages, admin management UI).
- League Tables (standings computed on the fly from FINISHED fixtures — no persisted table, just an aggregation over Competitions + Fixtures — shown on the competition detail page).
- Live Match Engine + Scout Live Engine: event-sourced `MatchEvent` log (goal, cards, subs, VAR, etc. — 19 types) is the sole source of truth; `Fixture.homeScore/awayScore` and `status` (LIVE/FINISHED) are recomputed transactionally from the event log on every write, never hand-edited. Real-time delivery via a push-only Socket.IO channel (`/live`, room-per-fixture). Scout recording UI (`/scout/fixtures/:id`, role-gated) records offline-tolerant via a localStorage-backed retry queue keyed by a client-generated idempotency UUID, so a dropped connection never loses or duplicates a tap. Public fixture pages update live without a refresh.
- Match Statistics: top scorers/assists per competition and career player stats (goals/assists/cards/appearances), all computed on read from the event log (same no-persisted-counters pattern as League Tables). Team form (`W`/`D`/`L`) shown as a column on the standings table.

Everything else in the MVP scope (News, Media, Search, Public Website, Admin Dashboard) is not yet implemented.
