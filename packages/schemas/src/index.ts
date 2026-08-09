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
