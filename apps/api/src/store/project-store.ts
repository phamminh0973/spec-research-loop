/**
 * In-memory, project-scoped repositories for P0.
 *
 * The architecture (docs/03 §6) defines module boundaries (`literature`,
 * `evidence`, `research_design`, …) that communicate through application
 * services in the same backend. P0 ships without PostgreSQL; these maps are
 * the single in-process source of truth and are replaced by `pg` +
 * node-pg-migrate when the persistence epic lands.
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
  GapProposalOutput,
  SourceDocument,
} from "@specloop/schemas";
import { UuidSchema } from "@specloop/schemas";
import { TRPCError } from "@trpc/server";

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

export const sourcesByProject = new Map<string, SourceDocument[]>();
export const evidenceSpansByProject = new Map<string, EvidenceSpan[]>();
export const claimEvidenceLinksByProject = new Map<string, ClaimEvidenceLink[]>();
export const atomicClaimsByProject = new Map<string, AtomicClaim[]>();
export const contributionsByProject = new Map<string, Contribution[]>();
export const experimentPlansByProject = new Map<string, ExperimentPlan[]>();

/**
 * Most recent gap proposal per project. Kept separate from the persisted
 * claims because a gap proposal is *proposed* data until the user selects
 * one (AI design §17 human confirmation point).
 */
export const gapProposalsByProject = new Map<string, GapProposalOutput>();

/** Test-only escape hatch: drop every in-memory collection. */
export function resetProjectStore(): void {
  sourcesByProject.clear();
  evidenceSpansByProject.clear();
  claimEvidenceLinksByProject.clear();
  atomicClaimsByProject.clear();
  contributionsByProject.clear();
  experimentPlansByProject.clear();
  gapProposalsByProject.clear();
}

/** Return (or create) the list backing a project-scoped collection. */
export function getOrCreate<K, V>(map: Map<K, V[]>, key: K): V[] {
  let list = map.get(key);
  if (!list) {
    list = [];
    map.set(key, list);
  }
  return list;
}
