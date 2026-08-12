/**
 * Shared Zod schemas and inferred TypeScript types for SpecLoop.
 *
 * This package is the single source of truth for:
 *   - runtime validation of tRPC inputs in `apps/api`
 *   - TypeScript types consumed by both `apps/api` and `apps/web`
 *
 * Schemas here are deliberately small in P0. They cover the minimum surface
 * needed to demonstrate end-to-end type safety between the web app and the
 * backend. Domain-specific schemas (projects, spec nodes, evidence, judges,
 * versions) will be added incrementally as the corresponding User Stories
 * move out of `PLANNED`.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const UuidSchema = z.string().uuid();
export type Uuid = z.infer<typeof UuidSchema>;

export const IsoTimestampSchema = z
  .string()
  .datetime({ offset: true })
  .describe("ISO 8601 timestamp with offset, e.g. 2026-08-08T07:00:00Z");
export type IsoTimestamp = z.infer<typeof IsoTimestampSchema>;

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export const HealthStatusSchema = z.object({
  status: z.enum(["ok", "degraded", "down"]),
  service: z.literal("specloop-api"),
  version: z.string(),
  timestamp: IsoTimestampSchema,
});
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

// ---------------------------------------------------------------------------
// Projects (skeleton — full schema lands with US-01)
// ---------------------------------------------------------------------------

export const ProjectSummarySchema = z.object({
  id: UuidSchema,
  title: z.string().min(1).max(200),
  domain: z.string().max(100).nullable(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

export const CreateProjectInputSchema = z.object({
  title: z.string().min(1).max(200),
  domain: z.string().max(100).optional(),
  rawIdea: z.string().min(10).max(20_000),
  resourceConstraints: z.array(z.string().min(1).max(200)).max(20).default([]),
});
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

export const ListProjectsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: UuidSchema.optional(),
});
export type ListProjectsInput = z.infer<typeof ListProjectsInputSchema>;

export const ListProjectsOutputSchema = z.object({
  items: z.array(ProjectSummarySchema),
  nextCursor: UuidSchema.nullable(),
});
export type ListProjectsOutput = z.infer<typeof ListProjectsOutputSchema>;

// ---------------------------------------------------------------------------
// Idea interpretation (AIT-01 / "Bước 1 — Idea interpretation")
//
// Contract source: docs/source/02-approved-proposal.md §9 "Bước 1", mirrored
// in docs/04-ai-system-design.md §2 (AIT-01) and §3 (PT-01). This is a P0
// human-gated AI task: output is always PROPOSED until the user chooses
// Confirm/Edit/Regenerate/Other (US-02, US-03; docs/04-ai-system-design.md
// §17). The application — never the model — assigns USER_CONFIRMED.
// ---------------------------------------------------------------------------

export const InterpretIdeaInputSchema = z.object({
  projectId: UuidSchema,
  rawIdea: z.string().min(10).max(20_000),
  domain: z.string().max(100).optional(),
  deadline: IsoTimestampSchema.optional(),
  resourceConstraints: z.array(z.string().min(1).max(200)).max(20).default([]),
});
export type InterpretIdeaInput = z.infer<typeof InterpretIdeaInputSchema>;

/**
 * Model-facing output shape, matching the approved-proposal JSON skeleton
 * exactly: two interpretation strings plus three flat string lists. Kept
 * free of nested objects/IDs because Bước 1 has no prior corpus/nodes to
 * reference yet — there is nothing an interpretation could point `source_refs`
 * at (see docs/04-ai-system-design.md §2.1 for the node schema used from
 * Bước 2 onward, once nodes exist).
 */
export const InterpretationOutputSchema = z.object({
  simpleInterpretation: z.string().min(1).max(4_000),
  technicalInterpretation: z.string().min(1).max(4_000),
  assumptions: z.array(z.string().min(1).max(500)).max(20),
  objectives: z.array(z.string().min(1).max(500)).max(20),
  ambiguities: z.array(z.string().min(1).max(500)).max(20),
});
export type InterpretationOutput = z.infer<typeof InterpretationOutputSchema>;

/**
 * Persisted/returned record: proposed output plus the provenance fields
 * docs/04-ai-system-design.md §5 requires every model call to record
 * (task, prompt/schema version, provider/model, retry count, status).
 * `status` starts `PROPOSED`; only the US-03 confirmation gate may move it
 * to `USER_CONFIRMED` (BR-01) — this schema deliberately has no path to set
 * that value from the AI response.
 */
export const InterpretationStatusSchema = z.enum([
  "PROPOSED",
  "USER_CONFIRMED",
]);
export type InterpretationStatus = z.infer<typeof InterpretationStatusSchema>;

export const InterpretationRecordSchema = z.object({
  projectId: UuidSchema,
  output: InterpretationOutputSchema,
  status: InterpretationStatusSchema,
  promptId: z.literal("PT-01"),
  promptVersion: z.string().min(1),
  schemaVersion: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  retryCount: z.number().int().min(0),
  createdAt: IsoTimestampSchema,
});
export type InterpretationRecord = z.infer<typeof InterpretationRecordSchema>;
