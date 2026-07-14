# syntax=docker/dockerfile:1.7
#
# Standalone Next.js output in a pnpm monorepo: outputFileTracingRoot (see
# next.config.ts) makes the traced `.next/standalone` folder mirror paths from
# the repo root, so it nests as .next/standalone/apps/web/server.js rather than
# .next/standalone/server.js — the COPY paths below reflect that.
#
# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so the
# API URL has to be supplied as a build ARG, not just a runtime env var.

FROM node:20-alpine AS base
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
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
COPY . .
RUN pnpm --filter @4ef/web build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node", "server.js"]
