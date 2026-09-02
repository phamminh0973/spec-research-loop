import { z } from "zod";

import { IsoTimestampSchema, UuidSchema } from "./common";

/**
 * Entry type for an evidence span. `EXACT` requires a verbatim text match
 * against the source page; `ABSTRACT`/`MANUAL` are fallback tiers with
 * explicit provenance (AI design §7).
 */
export const EvidenceEntryTypeSchema = z.enum(["EXACT", "ABSTRACT", "MANUAL"]);
export type EvidenceEntryType = z.infer<typeof EvidenceEntryTypeSchema>;

export const EvidenceSpanSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  sourceId: UuidSchema,
  /** 1-based page number when the source has pages; null for abstract/manual. */
  page: z.number().int().positive().nullable(),
  /** Character offsets on the page; null for abstract/manual evidence. */
  startOffset: z.number().int().nonnegative().nullable(),
  endOffset: z.number().int().nonnegative().nullable(),
  /** Verbatim text the user selected. Required for `EXACT` spans. */
  exactText: z.string().min(1).max(10_000),
  entryType: EvidenceEntryTypeSchema,
  createdAt: IsoTimestampSchema,
});
export type EvidenceSpan = z.infer<typeof EvidenceSpanSchema>;

export const CreateEvidenceSpanInputSchema = z.object({
  projectId: UuidSchema,
  sourceId: UuidSchema,
  page: z.number().int().positive().nullable().default(null),
  startOffset: z.number().int().nonnegative().nullable().default(null),
  endOffset: z.number().int().nonnegative().nullable().default(null),
  exactText: z.string().min(1).max(10_000),
  /** Defaults to `EXACT` when page/offsets are present, else `MANUAL`. */
  entryType: EvidenceEntryTypeSchema.optional(),
});
export type CreateEvidenceSpanInput = z.infer<typeof CreateEvidenceSpanInputSchema>;

export const ListEvidenceSpansInputSchema = z.object({
  projectId: UuidSchema,
  sourceId: UuidSchema.optional(),
  limit: z.number().int().min(1).max(100).default(50),
});
export type ListEvidenceSpansInput = z.infer<typeof ListEvidenceSpansInputSchema>;

export const ListEvidenceSpansOutputSchema = z.object({
  items: z.array(EvidenceSpanSchema),
});
export type ListEvidenceSpansOutput = z.infer<typeof ListEvidenceSpansOutputSchema>;

/**
 * Operator defining what a measured metric value must satisfy to verify a
 * claim. `IN_RANGE` expects `threshold` to encode a numeric interval
 * (e.g. "0.80 – 0.95" or "[2, 5]"), `STATISTICALLY_SIGNIFICANT` expects a
 * p-value / CI condition.
 */
export const EvidenceOperatorSchema = z.enum([
  "GT",
  "GTE",
  "LT",
  "LTE",
  "EQ",
  "IN_RANGE",
  "STATISTICALLY_SIGNIFICANT",
]);
export type EvidenceOperator = z.infer<typeof EvidenceOperatorSchema>;

/**
 * Persisted evidence requirement — what a metric value must satisfy for a
 * claim to be considered verified. Derived from (and linked to) an
 * {@link AtomicClaim} or a spec `CLAIM` node. This is *proposed* data until
 * the user confirms/edits; it does not self-verify a claim (BR-03).
 */
export const EvidenceRequirementSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  claimId: UuidSchema,
  /** Metric name copied / normalised from the source claim. */
  metric: z.string().trim().min(1).max(500),
  operator: EvidenceOperatorSchema,
  /** Threshold, interval or significance condition the metric must meet. */
  threshold: z.string().trim().min(1).max(500),
  /** Human-readable success criterion (e.g. "F1 ≥ 0.82 on held-out test"). */
  successCriterion: z.string().trim().min(1).max(2_000),
  /** Falsification condition (negation of success). */
  falsificationCriterion: z.string().trim().min(1).max(2_000),
  /** How the metric should be measured (dataset split, protocol hint). */
  measurementMethod: z.string().trim().min(1).max(2_000).optional(),
  /** Minimum observations / samples required to evaluate the criterion. */
  requiredObservations: z.array(z.string().trim().min(1).max(500)).default([]),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type EvidenceRequirement = z.infer<typeof EvidenceRequirementSchema>;

/**
 * LLM output shape for evidence-requirement generation. The application
 * assigns `id`/`projectId`/`claimId`/timestamps after validation — the model
 * only produces the verifiable criterion.
 */
export const GenerateEvidenceRequirementOutputSchema = z.object({
  metric: z.string().trim().min(1).max(500),
  operator: EvidenceOperatorSchema,
  threshold: z.string().trim().min(1).max(500),
  successCriterion: z.string().trim().min(1).max(2_000),
  falsificationCriterion: z.string().trim().min(1).max(2_000),
  measurementMethod: z.string().trim().min(1).max(2_000).optional(),
  requiredObservations: z.array(z.string().trim().min(1).max(500)).default([]),
});
export type GenerateEvidenceRequirementOutput = z.infer<
  typeof GenerateEvidenceRequirementOutputSchema
>;

export const GenerateEvidenceRequirementInputSchema = z.object({
  projectId: UuidSchema,
  claimId: UuidSchema,
});
export type GenerateEvidenceRequirementInput = z.infer<
  typeof GenerateEvidenceRequirementInputSchema
>;

export const ListEvidenceRequirementsInputSchema = z.object({
  projectId: UuidSchema,
  claimId: UuidSchema.optional(),
});
export type ListEvidenceRequirementsInput = z.infer<
  typeof ListEvidenceRequirementsInputSchema
>;

export const ListEvidenceRequirementsOutputSchema = z.object({
  items: z.array(EvidenceRequirementSchema),
});
export type ListEvidenceRequirementsOutput = z.infer<
  typeof ListEvidenceRequirementsOutputSchema
>;