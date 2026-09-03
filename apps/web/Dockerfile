# SpecLoop web service image.
#
# PLANNED. Not yet exercised by `docker compose up`; see
# docs/03-architecture.md §16.

FROM node:20-alpine AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/schemas/package.json packages/schemas/package.json
RUN pnpm install --filter @specloop/web... --frozen-lockfile=false

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN pnpm --filter @specloop/web run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 3000
CMD ["pnpm", "--filter", "@specloop/web", "start"]
