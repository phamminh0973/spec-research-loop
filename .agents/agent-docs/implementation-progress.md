# Implementation progress

Last reviewed: 2026-08-17

Repository status: `SCAFFOLDED`, first Week-1 vertical-slice piece
`IN_PROGRESS`. Local install, typecheck, production build and API/web smoke
checks have been observed; most product workflow, automated tests,
benchmarking and Docker deployment remain `PLANNED`.

| Area                                             | Status                                                                                              | Evidence / next reference                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo scaffold (pnpm)                         | SCAFFOLDED — locally verified                                                                       | `corepack pnpm install` / `corepack pnpm install --frozen-lockfile`; recursive typecheck/build observed 2026-08-10; re-verified 2026-08-13                                                                                                                                                                                                                                                                                      |
| Shared schemas package                           | IN_PROGRESS — typecheck/test verified                                                               | `packages/schemas/src/index.ts`; `tsc --noEmit` clean 2026-08-10; `vitest run` (9 passed) observed 2026-08-13                                                                                                                                                                                                                                                                                                                   |
| Web application (`apps/web`)                     | SCAFFOLDED — build/smoke verified                                                                   | Next.js production build passed; local HTTP `/` returned 200 on 2026-08-10                                                                                                                                                                                                                                                                                                                                                      |
| API modular monolith (`apps/api`)                | IN_PROGRESS / SCAFFOLDED — typecheck and smoke-verified                                             | Added `literature`, `evidence`, `researchDesign` routers + project store; TypeScript build passed and local `/healthz` returned `status=ok` on 2026-08-10; `tsc --noEmit` clean 2026-08-10                                                                                                                                                                                                                                      |
| US-02 idea interpretation (AIT-01, TT-US02-01)   | IN_PROGRESS — schema/prompt/service + contract tests                                                | `apps/api/src/interpretation/{prompt,service}.ts`, `apps/api/src/routers/interpretation.ts`; `packages/schemas` `InterpretIdeaInputSchema`/`InterpretationOutputSchema`/`InterpretationRecordSchema`; `vitest run` (7 passed) in `apps/api` observed 2026-08-13; no real provider call (tests use fake client)                                                                                                                  |
| Step 2 structured decomposition (AIT-02 / US-04) | IN_PROGRESS — assignment alignment implemented and locally verified on `codex/feature/align-step-2` | Shared required-type contract, PT-02 completeness/evidence boundary, deterministic integrity rules, conflict mapping, complete fixture, coverage/filter/readiness models, focused review UI; `pnpm test` passed schemas 21/API 83/web 10 tests on 2026-08-17; recursive `pnpm typecheck`, `pnpm build`, scoped Prettier check and `git diff --check` passed; API-backed browser smoke and durable persistence remain unverified |
| Background worker (`apps/worker`)                | PLANNED                                                                                             | `docs/03-architecture-and-technical-design.md`                                                                                                                                                                                                                                                                                                                                                                                  |
| AI and evidence workflow                         | IN_PROGRESS                                                                                         | UC-04/UC-05/UC-06 routers added; LLM gateway and AIT stubs present; no real provider calls (no `OPENAI_API_KEY`) — tests use injected fake client                                                                                                                                                                                                                                                                               |
| Test and evaluation                              | PARTIAL — `vitest` wired in parts of the monorepo                                                   | `packages/schemas/vitest.config.ts`, `apps/api/vitest.config.ts`; `vitest` observed passing tests in `packages/schemas` and `apps/api`; package test/lint scripts remain placeholders                                                                                                                                                                                                                                           |
| Local delivery                                   | PARTIALLY VERIFIED                                                                                  | Local API/web smoke passed; `docker compose config` resolved; Docker image build/deployment has not been verified                                                                                                                                                                                                                                                                                                               |
| ADR-001 (Node + tRPC backend)                    | ACCEPTED 2026-08-08                                                                                 | `docs/architecture/adrs/ADR-001-trpc-backend.md`                                                                                                                                                                                                                                                                                                                                                                                |

> The scaffold rows above are **not** a claim of product completion. Formatting
> currently fails on repository files, lint remains a placeholder, and Docker
> deployment has not been exercised. Mark a capability `DONE` only after its
> acceptance criteria and verification evidence exist — US-02 needs web UI
> integration (TT-US02-02) and real-provider verification before it can move
> past `IN_PROGRESS`.

## UC-04 to UC-06 — implementation notes (2026-08-10)

Added the three capability modules behind UC-04…UC-06 as tRPC routers wired
into `AppRouter`. Persistence is in-memory for P0 (`apps/api/src/store/project-store.ts`).

The LLM now _proposes_ (suggests) search queries, evidence spans, gap
candidates, contributions/claims, and experiment plans through a shared
structured-output gateway (`apps/api/src/llm/structured-call.ts`). The
application retains execution authority (arXiv search, integrity checks, id
assignment) and the user retains confirmation authority (select sources,
confirm spans, pick gap candidates). All AI output is PROPOSED data; the
model never self-assigns `USER_CONFIRMED` or `SYSTEM_VERIFIED` (AI design §2.1).

| Use case                        | Module           | Router                                    | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | ---------------- | ----------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UC-04 Build literature corpus   | `literature`     | `apps/api/src/routers/literature.ts`      | IN_PROGRESS | `literature.generateQueries` (AIT-03) asks the LLM to propose arXiv queries from the research context; `literature.searchWithAnalysis` lets the LLM drive the arXiv search via the `search_arxiv` tool (application executes the tool call, §16) and then produces per-paper achievedOutcome/methodology/additionalResearchNeeded relative to the user's idea; `literature.search` executes an explicit query via `executeArxivSearch`; `literature.importManual` is the API-unavailable fallback; `literature.select` is the human confirmation point. |
| UC-05 Ground claims in evidence | `evidence`       | `apps/api/src/routers/evidence.ts`        | IN_PROGRESS | `evidence.proposeSpans` (AIT-05-propose) asks the LLM to suggest verbatim excerpts + rationale from the selected corpus for a claim; `evidence.createSpan` stores page/offsets/exact text (EXACT requires offsets); `evidence.createLink` + `evidence.runIntegrityChecks` compute deterministic integrity; `evidence.runReview` (AIT-05) calls the LLM for an atomic verdict + reason, validated against the allowed enum.                                                                                                                              |
| UC-06 Design research           | `researchDesign` | `apps/api/src/routers/research-design.ts` | IN_PROGRESS | `generateGapProposal` (AIT-06) sends the selected corpus to the LLM and enforces the source-ID allowlist + novelty-risk warning (BR-04); `generateClaimDesign` (AIT-07) asks the LLM for contributions + falsifiable claims, assigns ids, persists as PROPOSED; `generateExperimentPlan` (AIT-08) asks the LLM for baselines/metrics/controls/ablations/estimates with assumed/measured input labels.                                                                                                                                                   |

Shared schemas for all three modules live in `packages/schemas/src/index.ts`
(`SourceDocument`, `EvidenceSpan`, `ClaimEvidenceLink`, `GapCandidate`,
`AtomicClaim`, `ExperimentPlan`, `ProposedQuery`, `EvidenceReviewOutput`,
`ProposedEvidenceSpan`, and their input/output schemas).

AI gateway and prompts:

- `apps/api/src/llm/structured-call.ts` — single structured-output helper
  enforcing JSON-mode output, Zod schema validation, one bounded repair
  attempt, and the reference-ID allowlist (AI design §4 layers 2–3, §16).
- `apps/api/src/llm/prompts.ts` — prompt templates (PT-03/05/05-propose/06/
  07/08) with semantic versions; system policy is always separate from
  untrusted document/user content (§16.1–§16.2).

### Verification

- `get_errors` across all new/edited files: no compile or lint errors.
- No build/test/lint commands were run in this session; the typecheck
  evidence above is from the editor's language service, not a `tsc` run.
- The arXiv executor (`executeArxivSearch`) is reused unchanged; no new
  network path was added beyond the LLM gateway.

### Next steps

- Record prompt/model/call logs for every `structuredCall` (FR-21): task id,
  prompt version, schema version, provider/model, input hash, token usage,
  latency, retry count, status.
- Add automated tests for the deterministic paths (dedup, integrity checks,
  corpus-bounded gate, allowlist rejection) once the test runner is
  configured (NFR-08).
- Replace the in-memory store with PostgreSQL + node-pg-migrate when the
  persistence epic lands.
- Wire the claim-text lookup from `spec_structure` into `evidence.runReview`
  so the LLM sees the actual claim text rather than the node id.

Update this table when implementation begins. Before changing a status, read
the relevant PBI and acceptance criteria and add verifiable evidence.

## Step 2 P0 runtime update (2026-08-14)

The confirmed-interpretation gate remains server-side and Step 2 consumes the
snapshot through a read-only `Step1ConfirmedInterpretationReader`. The new PT-02
generator uses the existing shared structured-output gateway; the domain service
does not own an LLM client and Step 3 search/tooling remains outside this module.

The default API context now composes the Step 2 module with a process-scoped
in-memory graph store. Generated nodes receive AI-authority status history;
node/relation edits recompute deterministic missing/unsupported/conflict findings
and record SYSTEM status changes. The web workspace now supports relation
create/delete and status-history review in both API and explicitly labeled fixture
mode.

Observed verification on 2026-08-14:

- `pnpm test`: schemas 4 files/20 tests, API 14 files/72 tests, web 1 file/4
  tests passed.
- `pnpm typecheck`: schemas, API and web recursive typechecks passed.
- `pnpm build`: schemas check, API TypeScript build and Next.js production build
  passed.
- `git diff --check`: no whitespace errors.

This is a locally verified P0 runtime slice. Durable persistence, tenant/user
authorization, live provider execution/configuration and Step 3 integration are
still open; no Step 1 lifecycle behavior was changed for this slice.

## Step 2 browser UI smoke (2026-08-14)

Started the local API on port `4000` and the Next.js web app on port `3000`,
then opened the visible in-app browser at
`/projects/new?fixture=1`. The browser completed the user-facing path:

`Mở local Step 1` → `Confirm` → `Mở Step 2` → `Generate typed cards` → edit a
card → `Confirm`/`Reject` → add and delete a relation.

The rendered Step 2 fixture showed 4 typed nodes, 1 `NEEDS_REVIEW` node, 2
warnings, the initial relation, and status-history entries. Browser console
errors and the local API/web error logs were empty during the run. This used
the explicitly labeled local fixture so it is a real UI interaction smoke test,
not a live LLM/provider result. Fixture graph state is recreated on a full
page reload; durable persistence was therefore not claimed. The browser test
did not change Step 1 implementation or lifecycle behavior.

## Step 2 assignment alignment implementation (2026-08-17)

Implemented the remaining assignment/UI-reference alignment in the isolated
worktree branch `codex/feature/align-step-2` while preserving the existing Step
1 gate and Step 2 API lifecycle:

- `packages/schemas` now publishes the eight assignment-required Step 2 types;
  `RISK` remains optional and the complete decomposition fixture is available
  through the test-only `@specloop/schemas/fixtures` entry point.
- PT-02 requires every required type and tells the generator to use honest
  `MISSING`/`AMBIGUOUS` placeholders. `EVIDENCE` is explicitly an evidence
  requirement, not a fabricated paper, citation, source span, result, or
  verified support.
- Deterministic rules require `EVIDENCE`, do not require `RISK`, and only treat
  a `TESTED_BY` plan or provenance-backed user/system-confirmed evidence as
  claim support. Self/duplicate graph relations map to `CONFLICT` at tRPC.
- The integration fixture now covers all eight required types and verifies the
  confirmation gate, edit, user authority history, relation create/delete, and
  schema-valid graph responses.
- The local UI fixture contains all required cards plus optional risk. The web
  model exposes required-type coverage, stable filters, and readiness blockers.
  `Step2Workspace` owns query/mutation state while focused child components own
  presentation for overview, cards, warnings, relations, history, and handoff.

Observed verification:

- `pnpm test`: schemas 4 files/21 tests, API 15 files/83 tests, web 1 file/10
  tests passed.
- `pnpm typecheck`: schemas, API, and web recursive typechecks passed.
- `pnpm build`: schemas, API, and Next.js web production builds passed.
- Scoped Prettier check for all changed files passed; `git diff --check` passed.
- Fixture browser smoke on `http://localhost:3010` verified coverage, type/status
  filters, card edit, confirm/reject history, relation create/delete,
  duplicate-relation error handling, and no horizontal overflow at a 390px
  viewport. Browser error logs were empty.

Known verification limits:

- API-backed browser smoke was not run because `apps/api/.env` is not present in
  the isolated worktree; automated API integration tests still passed.
- Repository-wide `pnpm format:check` remains red because it reports 167
  pre-existing files outside this change. Changed files pass the scoped check.
- Lint remains unverified because package lint scripts are placeholders.
- This work does not claim PostgreSQL persistence, live provider execution,
  tenant authorization, or Step 3 implementation.
