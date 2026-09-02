# SpecLoop API service image.
#
# Builds and runs `apps/api` for `docker compose up`. Persistence is
# via Drizzle ORM + SQLite (`node:sqlite` DatabaseSync, see
# apps/api/src/db) — file-backed when DATABASE_PATH is set, otherwise
# in-memory (`:memory:`). Requires Node 22.5+ for `node:sqlite`.

FROM node:22-alpine AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/schemas/package.json packages/schemas/package.json
RUN pnpm install --filter @specloop/api... --frozen-lockfile=false

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @specloop/schemas run build && pnpm --filter @specloop/api run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
