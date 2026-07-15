# syntax=docker/dockerfile:1.7
#
# Multi-stage build for a pnpm workspace. Two things fall out of this on purpose:
#  - `deps` only sees package.json files, so it stays cached across code-only changes.
#  - the `build` stage (full devDependencies, incl. the `prisma` CLI) is also exposed
#    as a target on its own, because the pruned `runtime` image below drops
#    devDependencies via `pnpm deploy --prod` and therefore has no `prisma` CLI to run
#    migrations with. docker-compose's `api-migrate` service targets `build` instead.

FROM node:22 AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @4ef/api exec prisma generate
RUN pnpm --filter @4ef/api build
RUN pnpm --filter @4ef/api deploy --prod --legacy /prod/api

FROM node:22 AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /prod/api ./
COPY --from=build /repo/apps/api/prisma ./prisma
EXPOSE 4000
CMD ["node", "dist/main.js"]
