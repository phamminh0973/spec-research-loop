# ADR-001 — Adopt tRPC + Node backend in place of FastAPI

- **Status:** Accepted (2026-08-08)
- **Deciders:** SpecLoop team (3-person delivery)
- **Source precedence context:** This ADR overrides the FastAPI choice recorded in
  `docs/source/02-approved-proposal.md` §6 and the rationale in
  `docs/source/03-architecture-technology-rational.md` §3. The source documents
  themselves are not edited; downstream derived documents are updated to reflect
  this ADR.

## 1. Context

The approved proposal selected **FastAPI + Python** as the backend because the
team expected PDF processing, PyMuPDF, structured LLM output validation and
evaluation work to dominate the workload, and a Python-only stack was seen as
the lowest-cost option for a 3-person, 4-week MVP.

During the kick-off of implementation we re-evaluated that decision in light of
two new facts:

1. The team has stronger day-to-day fluency in TypeScript than in Python, and
   the only member who has shipped Python web services is also the one with the
   most concurrent AI/prompt work.
2. The user-facing workflow (project workspace, interpretation, nodes,
   literature, evidence, judges, revision, export) is dominated by typed
   request/response shapes that map cleanly onto a TypeScript-first RPC layer.
   End-to-end type safety between `apps/web` and the backend was identified as
   a higher-value property than Python-native PDF parsing at this stage of the
   project.

The Node ecosystem provides mature libraries for the parts of the workload we
actually need in P0:

- `@trpc/server` + `@trpc/client` for end-to-end typed RPC.
- `zod` for runtime validation that mirrors TypeScript types.
- `fastify` (or `express`) as the HTTP host.
- `pdf-parse` / `pdfjs-dist` for PDF text extraction at the page level.
- `pg` for PostgreSQL access.
- `pino` for structured logging.

The PDF and AI evaluation workloads that originally motivated FastAPI will be
revisited in a follow-up ADR if they become critical path; for P0 they are not
on the critical path of the user-facing workflow.

## 2. Decision

We adopt the following stack:

- **Monorepo:** pnpm workspaces.
- **Frontend:** Next.js (App Router) + TypeScript in `apps/web`.
- **Backend:** Node.js + TypeScript in `apps/api`, exposing its API exclusively
  through **tRPC** mounted on a Fastify HTTP server. REST is not exposed in P0.
- **Shared contracts:** Zod schemas in `packages/schemas`, imported by both
  `apps/api` (for input validation) and `apps/web` (via the generated tRPC
  client types).
- **End-to-end type safety:** the tRPC client in `apps/web` infers its types
  from the `AppRouter` exported by `apps/api`. No code generation step is
  required; the type link is preserved at compile time.

## 3. Consequences

### Positive

- A single TypeScript toolchain across web, api and shared packages.
- Compile-time guarantees that the frontend cannot call an endpoint that does
  not exist or send a payload that does not match the server-side Zod schema.
- Removes the need for an OpenAPI client generator or a separate Python
  service for the parts of the workflow we are building in P0.
- Smaller surface area for the team to learn (one language, one test runner
  family, one linter family).

### Negative / trade-offs

- Python-native libraries (PyMuPDF, scikit-learn, etc.) are no longer the
  default. If a future story needs them, we will either add a Python worker
  service (creating a second runtime) or find a Node equivalent. This is
  recorded as a risk in `docs/08-risk-security-and-cost.md`.
- We lose the OpenAPI documentation that FastAPI generated automatically. We
  will mitigate this by exporting a tRPC OpenAPI plugin output (or a hand-
  written OpenAPI doc) for the contract test suite.
- The team must maintain Zod schemas as the single source of truth for both
  runtime validation and TypeScript types.

### Neutral

- PostgreSQL remains the shared source of truth (no change).
- Docker Compose, modular monolith shape, and the four-week scope remain in
  place.

## 4. Conditions for revisiting

This ADR should be reconsidered if any of the following becomes true:

- A P0 user story requires a Python-only library that has no production-grade
  Node equivalent (for example, GROBID, a fine-tuned NLI model, or
  PyMuPDF-specific layout analysis).
- The team grows beyond three members and the Python-fluent subset can take
  full ownership of the AI/evidence subsystem.
- Performance or memory characteristics of Node-based PDF parsing become a
  blocker for the evidence workflow.

If any of these conditions are met, the next step is to draft ADR-002 (or
later) introducing a Python worker service that consumes the same Zod schemas
through a generated client, instead of replacing this decision wholesale.
