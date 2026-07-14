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

Everything else in the MVP scope (Live Match Engine, Scout Live Engine, League Tables, Match Statistics, News, Media, Search, Public Website, Admin Dashboard) is not yet implemented.
