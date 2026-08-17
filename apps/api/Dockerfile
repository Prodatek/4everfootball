# syntax=docker/dockerfile:1.7
#
# Multi-stage build for a pnpm workspace. Two things fall out of this on purpose:
#  - `deps` only sees package.json files, so it stays cached across code-only changes.
#  - the `build` stage (full devDependencies, incl. the `prisma` CLI) is also exposed
#    as a target on its own, because the pruned `runtime` image below drops
#    devDependencies and therefore has no `prisma` CLI to run migrations with.
#    docker-compose's `api-migrate` and `prisma-studio` services target `build`
#    instead. The `--prod` deploy step that strips devDependencies has to live
#    in its own `prod-deps` stage downstream of `build` rather than at the end
#    of `build` itself — `pnpm deploy --prod` mutates the workspace it runs in
#    as a side effect (it's how it computes the prod-only subset), so putting
#    it inside `build` was stripping `prisma` out of the exact image
#    `api-migrate`/`prisma-studio` depend on having it in.

FROM node:22 AS base
RUN corepack enable && pnpm config set store-dir /pnpm-store
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
# Cache mount persists pnpm's content-addressable store across builds (and
# across the api/web images, since both use the same cache id) — without
# this, every build re-fetches all ~1000+ packages from the registry from
# scratch, which is slow even on a fast connection and can time out on a
# slow one.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @4ef/api exec prisma generate
RUN pnpm --filter @4ef/api build

FROM build AS prod-deps
RUN pnpm --filter @4ef/api deploy --prod --legacy /prod/api
# `pnpm deploy --prod` re-derives node_modules from the lockfile/store, which
# does not carry over `prisma generate`'s output (it's written into
# node_modules as a build-time side effect, not a tracked dependency) — so
# the deployed client is present but ungenerated. Regenerate it in place:
# prisma resolves @prisma/client by walking up from --schema's directory, so
# pointing it at the copied schema here makes it write into
# /prod/api/node_modules, exactly where the runtime image needs it.
COPY apps/api/prisma /prod/api/prisma
RUN pnpm --filter @4ef/api exec prisma generate --schema=/prod/api/prisma/schema.prisma

FROM node:22 AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /prod/api ./
COPY --from=build /repo/apps/api/prisma ./prisma
EXPOSE 4000
CMD ["node", "dist/main.js"]
