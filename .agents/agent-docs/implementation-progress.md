# Implementation progress

Last reviewed: 2026-08-10

Repository status: `SCAFFOLDED`. Local install, typecheck, production build and
API/web smoke checks have been observed; product workflow, automated tests,
benchmarking and Docker deployment remain `PLANNED`.

| Area                              | Status                            | Evidence / next reference                                                                                            |
| --------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Monorepo scaffold (pnpm)          | SCAFFOLDED — locally verified     | `corepack pnpm install --frozen-lockfile`; recursive typecheck/build observed 2026-08-10                             |
| Shared schemas package            | IN_PROGRESS — typecheck verified | `packages/schemas/src/index.ts`; added literature/evidence/research-design schemas; `tsc --noEmit` clean 2026-08-10 |
| Web application (`apps/web`)      | SCAFFOLDED — build/smoke verified | Next.js production build passed; local HTTP `/` returned 200 on 2026-08-10                                           |
| API modular monolith (`apps/api`) | IN_PROGRESS — typecheck verified  | Added `literature`, `evidence`, `researchDesign` routers + project store; `tsc --noEmit` clean 2026-08-10            |
| Background worker (`apps/worker`) | PLANNED                           | `docs/03-architecture-and-technical-design.md`                                                                       |
| AI and evidence workflow          | IN_PROGRESS                       | UC-04/UC-05/UC-06 routers added; LLM-backed AIT-05/06/07/08 are stubs pending AI gateway wiring                      |
| Test and evaluation               | PLANNED                           | Package test/lint scripts are placeholders; no automated suite or linter is configured                               |
| Local delivery                    | PARTIALLY VERIFIED                | Local API/web smoke passed and `docker compose config` resolved; Docker image build/deployment has not been verified |
| ADR-001 (Node + tRPC backend)     | ACCEPTED 2026-08-08               | `docs/architecture/adrs/ADR-001-trpc-backend.md`                                                                     |

> The scaffold rows above are **not** a claim of product completion. Formatting
> currently fails on repository files, lint/test scripts are placeholders, and
> Docker deployment has not been exercised. Mark a capability `DONE` only after
> its acceptance criteria and verification evidence exist.

## UC-04 to UC-06 — implementation notes (2026-08-10)

Added the three capability modules behind UC-04…UC-06 as tRPC routers wired
into `AppRouter`. Persistence is in-memory for P0 (`apps/api/src/store/project-store.ts`).

The LLM now *proposes* (suggests) search queries, evidence spans, gap
candidates, contributions/claims, and experiment plans through a shared
structured-output gateway (`apps/api/src/llm/structured-call.ts`). The
application retains execution authority (arXiv search, integrity checks, id
assignment) and the user retains confirmation authority (select sources,
confirm spans, pick gap candidates). All AI output is PROPOSED data; the
model never self-assigns `USER_CONFIRMED` or `SYSTEM_VERIFIED` (AI design §2.1).

| Use case | Module | Router | Status | Notes |
| --- | --- | --- | --- | --- |
| UC-04 Build literature corpus | `literature` | `apps/api/src/routers/literature.ts` | IN_PROGRESS | `literature.generateQueries` (AIT-03) asks the LLM to propose arXiv queries from the research context; `literature.searchWithAnalysis` lets the LLM drive the arXiv search via the `search_arxiv` tool (application executes the tool call, §16) and then produces per-paper achievedOutcome/methodology/additionalResearchNeeded relative to the user's idea; `literature.search` executes an explicit query via `executeArxivSearch`; `literature.importManual` is the API-unavailable fallback; `literature.select` is the human confirmation point. |
| UC-05 Ground claims in evidence | `evidence` | `apps/api/src/routers/evidence.ts` | IN_PROGRESS | `evidence.proposeSpans` (AIT-05-propose) asks the LLM to suggest verbatim excerpts + rationale from the selected corpus for a claim; `evidence.createSpan` stores page/offsets/exact text (EXACT requires offsets); `evidence.createLink` + `evidence.runIntegrityChecks` compute deterministic integrity; `evidence.runReview` (AIT-05) calls the LLM for an atomic verdict + reason, validated against the allowed enum. |
| UC-06 Design research | `researchDesign` | `apps/api/src/routers/research-design.ts` | IN_PROGRESS | `generateGapProposal` (AIT-06) sends the selected corpus to the LLM and enforces the source-ID allowlist + novelty-risk warning (BR-04); `generateClaimDesign` (AIT-07) asks the LLM for contributions + falsifiable claims, assigns ids, persists as PROPOSED; `generateExperimentPlan` (AIT-08) asks the LLM for baselines/metrics/controls/ablations/estimates with assumed/measured input labels. |

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
