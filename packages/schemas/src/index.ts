/**
 * Shared Zod schemas and inferred TypeScript types for SpecLoop.
 *
 * This package is the single source of truth for:
 *   - runtime validation of tRPC inputs in `apps/api`
 *   - TypeScript types consumed by both `apps/api` and `apps/web`
 *
 * Schemas are grouped by feature module, mirroring the module boundaries in
 * `docs/03-architecture-and-technical-design.md` §4.3:
 *
 *   - `common`           primitives (uuid, iso timestamp, non-empty text)
 *   - `health`           service health status
 *   - `projects`         project lifecycle, idea, domain, constraints
 *   - `interpretation`   idea understanding, confirmation gate, decisions
 *   - `spec-graph`       typed nodes, edges, statuses, relation integrity
 *   - `decomposition`    structured decomposition of a confirmed idea
 *   - `literature`       academic search, normalize, deduplicate, select
 *   - `evidence`         spans, provenance, claim links, verifier
 *   - `research-design`  gap, contribution, claim, experiment, feasibility
 */

export * from "./common";
export * from "./health";
export * from "./projects";
export * from "./interpretation";
export * from "./spec-graph";
export * from "./decomposition";
export * from "./literature";
export * from "./evidence";
export * from "./research-design";
