# SpecLoop monorepo

This repository is a pnpm workspace. The intended layout is:

```text
apps/
  web/         Next.js + TypeScript (App Router)
  api/         Node.js + tRPC + Fastify modular monolith
  worker/      same-domain job runner (added in a follow-up)
packages/
  schemas/     shared Zod schemas + inferred TypeScript types
  prompts/     prompt templates and metadata (added in a follow-up)
infrastructure/
tests/
docs/
```

## End-to-end type safety

The web app imports `AppRouter` from `@specloop/api`:

```ts
// apps/web/src/lib/trpc.ts
import type { AppRouter } from "@specloop/api";
import { createTRPCReact } from "@trpc/react-query";

export const trpc = createTRPCReact<AppRouter>();
```

`AppRouter` is the type of the root tRPC router exported by `apps/api`. Every
procedure name, input schema and output schema is therefore visible to the
web app at compile time. Renaming a procedure or changing its Zod schema on
the backend causes the frontend call site to fail to compile until it is
updated.

## Local development

> The scaffold has not been verified end-to-end yet. The commands below are
> the intended workflow; running them requires `pnpm` 9.x and Node.js 20+.

```bash
pnpm install
pnpm dev:api    # starts the tRPC/Fastify server on :4000
pnpm dev:web    # starts the Next.js dev server on :3000
```

`apps/web` reads `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:4000`)
to locate the API. The tRPC client appends `/trpc` automatically.

## Why this stack?

See [`docs/architecture/adrs/ADR-001-trpc-backend.md`](docs/architecture/adrs/ADR-001-trpc-backend.md).
The ADR records the trade-offs of replacing the FastAPI backend recorded in
`docs/source/02-approved-proposal.md` with a Node.js + tRPC backend.
