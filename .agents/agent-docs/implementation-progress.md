# Implementation progress

Last reviewed: 2026-08-08

Repository status: `PLANNED`. No application source code, completed build, test
run, benchmark, or deployment is recorded by this document.

| Area | Status | Evidence / next reference |
| --- | --- | --- |
| Monorepo scaffold (pnpm) | SCAFFOLDED — not yet verified | `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `MONOREPO.md` |
| Shared schemas package | SCAFFOLDED — not yet verified | `packages/schemas/src/index.ts` (Zod + inferred TS types) |
| Web application (`apps/web`) | SCAFFOLDED — not yet verified | Next.js App Router + tRPC React Query client |
| API modular monolith (`apps/api`) | SCAFFOLDED — not yet verified | Node.js + tRPC + Fastify; `AppRouter` exported from `@specloop/api` |
| Background worker (`apps/worker`) | PLANNED | `docs/03-architecture-and-technical-design.md` |
| AI and evidence workflow | PLANNED | `docs/04-ai-system-design.md` |
| Test and evaluation | PLANNED | `docs/07-test-and-evaluation-plan.md` |
| Local delivery | PLANNED | `docker-compose.yml` references `apps/api` and `apps/web` Dockerfiles that have not been exercised |
| ADR-001 (Node + tRPC backend) | ACCEPTED 2026-08-08 | `docs/architecture/adrs/ADR-001-trpc-backend.md` |

> The scaffold rows above are **not** a claim of completion. `pnpm install`,
> `pnpm dev`, `pnpm build`, `pnpm typecheck`, and `docker compose config` have
> not been run in the verified environment yet. Mark a row `DONE` only after
> the relevant command has been observed to succeed and the evidence is
> linked here.

Update this table when implementation begins. Before changing a status, read
the relevant PBI and acceptance criteria and add verifiable evidence.
