/**
 * Project-scoped repositories for P0.
 *
 * The architecture (docs/03 §6) defines module boundaries (`literature`,
 * `evidence`, `research_design`, …) that communicate through application
 * services in the same backend. Each store below is a `PersistedMap` (see
 * `../db/persisted-map.ts`): a synchronous, in-memory `Map`-compatible
 * cache that also write-throughs to Postgres when `DATABASE_URL` is
 * configured, and is silently a pure in-memory Map when it is not — which
 * is exactly the mode every vitest suite runs in. Call sites elsewhere in
 * the codebase are unaware of any of this; they only ever call
 * `.get`/`.set`/`.clear`/`.entries`, same as before persistence existed.
 *
 * Each repository is keyed by project id so cross-project leakage is
 * impossible at the data layer. Records are plain objects validated by the
 * Zod schemas in `@specloop/schemas` before they enter a store, so callers
 * can rely on the stored shape.
 */

import type {
  AtomicClaim,
  ClaimEvidenceLink,
  Contribution,
  EvidenceSpan,
  ExperimentPlan,
  FindingResolution,
  GapProposalOutput,
  InterpretationDecision,
  InterpretationRecord,
  JudgePanelResult,
  ResearchSpec,
  SourceDocument,
  SpecGraphView,
} from "@specloop/schemas";
import { UuidSchema } from "@specloop/schemas";
import { TRPCError } from "@trpc/server";
import { PersistedMap, PersistedNestedMap } from "../db/persisted-map.js";

/**
 * Validate and coerce a value against a Zod schema, rethrowing as a tRPC
 * `INTERNAL_SERVER_ERROR` on failure. Used at store boundaries so a bad
 * record never silently propagates.
 */
export function parseOrThrow<T>(
  schema: { parse: (v: unknown) => T },
  value: unknown,
  label: string,
): T {
  try {
    return schema.parse(value);
  } catch (err) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Invalid ${label} record in store: ${(err as Error).message}`,
    });
  }
}

export function assertUuid(id: string, label = "id"): void {
  UuidSchema.parse(id);
  void label;
}

// ---------------------------------------------------------------------------
// Per-project collections
// ---------------------------------------------------------------------------

export const sourcesByProject = new PersistedMap<SourceDocument[]>({
  storeKey: "sourcesByProject",
});
export const evidenceSpansByProject = new PersistedMap<EvidenceSpan[]>({
  storeKey: "evidenceSpansByProject",
});
export const claimEvidenceLinksByProject = new PersistedMap<ClaimEvidenceLink[]>({
  storeKey: "claimEvidenceLinksByProject",
});
export const atomicClaimsByProject = new PersistedMap<AtomicClaim[]>({
  storeKey: "atomicClaimsByProject",
});
export const contributionsByProject = new PersistedMap<Contribution[]>({
  storeKey: "contributionsByProject",
});
export const experimentPlansByProject = new PersistedMap<ExperimentPlan[]>({
  storeKey: "experimentPlansByProject",
});

/**
 * Most recent gap proposal per project. Kept separate from the persisted
 * claims because a gap proposal is *proposed* data until the user selects
 * one (AI design §17 human confirmation point).
 */
export const gapProposalsByProject = new PersistedMap<GapProposalOutput>({
  storeKey: "gapProposalsByProject",
});

/**
 * Most recent Judge panel result per project (Bước 9 / AIT-09). Kept as a
 * single latest value per project, mirroring `gapProposalsByProject` — the
 * user reviews and decides revisions (Bước 10) against this run before a
 * new one supersedes it.
 */
export const judgePanelsByProject = new PersistedMap<JudgePanelResult>({
  storeKey: "judgePanelsByProject",
});

/**
 * Assembled research-spec versions per project (Bước 8, AIT-10). Every
 * generate call appends a new version rather than overwriting — Bước 10's
 * revision loop needs the full history to diff against.
 */
export const researchSpecsByProject = new PersistedMap<ResearchSpec[]>({
  storeKey: "researchSpecsByProject",
});

/**
 * Bước 10 finding-resolution decisions per project (see `revision` module).
 * Append-only — every decision on a Judge finding is kept for the decision
 * log (Section 14 of the research spec), never overwritten.
 */
export const findingResolutionsByProject = new PersistedMap<FindingResolution[]>({
  storeKey: "findingResolutionsByProject",
});

/**
 * Most recent Judge panel result per project (Bước 9 / AIT-09). Kept as a
 * single latest value per project, mirroring `gapProposalsByProject` — the
 * user reviews and decides revisions (Bước 10) against this run before a
 * new one supersedes it.
 */
export const judgePanelsByProject = new Map<string, JudgePanelResult>();

/**
 * Assembled research-spec versions per project (Bước 8, AIT-10). Every
 * generate call appends a new version rather than overwriting — Bước 10's
 * revision loop needs the full history to diff against.
 */
export const researchSpecsByProject = new Map<string, ResearchSpec[]>();

/**
 * Bước 10 finding-resolution decisions per project (see `revision` module).
 * Append-only — every decision on a Judge finding is kept for the decision
 * log (Section 14 of the research spec), never overwritten.
 */
export const findingResolutionsByProject = new Map<string, FindingResolution[]>();

/**
 * Per-project decomposition graph (Bước 2 / AIT-02). Backs the
 * spec-structure module's `InMemorySpecGraphStore`; each value is a validated
 * `SpecGraphView` and is replaced atomically on regeneration.
 */
export const specGraphsByProject = new PersistedMap<SpecGraphView>({
  storeKey: "specGraphsByProject",
});

/**
 * Per-project interpretation versions (Bước 1 / AIT-01). Outer key is project
 * id; inner map is keyed by interpretation id so a project can retain
 * superseded versions alongside the active proposal. Uses
 * `PersistedNestedMap` since the value itself is a `Map`, which
 * `PersistedMap` cannot represent as a single JSONB row.
 */
export const interpretationsByProject = new PersistedNestedMap<InterpretationRecord>({
  storeKey: "interpretationsByProject",
});

/** Per-project decision trail for the Step 1 confirm/revise/regenerate lifecycle. */
export const interpretationDecisionsByProject = new PersistedMap<InterpretationDecision[]>({
  storeKey: "interpretationDecisionsByProject",
});

/**
 * Every `PersistedMap`/`PersistedNestedMap` above, for `db/hydrate.ts` to
 * hydrate at startup without needing to know each store's value type.
 */
export const ALL_PERSISTED_STORES: { hydrate(): Promise<void> }[] = [
  sourcesByProject,
  evidenceSpansByProject,
  claimEvidenceLinksByProject,
  atomicClaimsByProject,
  contributionsByProject,
  experimentPlansByProject,
  gapProposalsByProject,
  judgePanelsByProject,
  researchSpecsByProject,
  findingResolutionsByProject,
  specGraphsByProject,
  interpretationsByProject,
  interpretationDecisionsByProject,
];

/** Test-only escape hatch: drop every in-memory cache. Never touches Postgres — see the module doc comment above. */
export function resetProjectStore(): void {
  sourcesByProject.clear();
  evidenceSpansByProject.clear();
  claimEvidenceLinksByProject.clear();
  atomicClaimsByProject.clear();
  contributionsByProject.clear();
  experimentPlansByProject.clear();
  gapProposalsByProject.clear();
  judgePanelsByProject.clear();
  researchSpecsByProject.clear();
  findingResolutionsByProject.clear();
  specGraphsByProject.clear();
  interpretationsByProject.clear();
  interpretationDecisionsByProject.clear();
}

/**
 * Append items to a project-scoped list and write the *new* array back via
 * `.set()`. Prefer this over reading a list and calling `.push()` on it
 * for any store that may be backed by `PersistedMap` (see
 * `db/persisted-map.ts`): a `.push()` on the array returned by `.get()`
 * mutates it in place and never calls `.set()`, so a write-through
 * persistence layer would never see the change.
 */
export function appendToProjectList<K, V>(
  map: { get(key: K): V[] | undefined; set(key: K, value: V[]): unknown },
  key: K,
  ...items: V[]
): V[] {
  const updated = [...(map.get(key) ?? []), ...items];
  map.set(key, updated);
  return updated;
}

/**
 * Re-persist a project-scoped list after mutating its elements in place
 * (e.g. filling in `source.analysis` on existing `SourceDocument`s). The
 * in-memory array is already correct by reference; this just forces a
 * `.set()` so a write-through persistence layer picks up the change too.
 */
export function touchProjectList<K, V>(
  map: { get(key: K): V[] | undefined; set(key: K, value: V[]): unknown },
  key: K,
): V[] {
  const list = map.get(key) ?? [];
  map.set(key, list);
  return list;
}
