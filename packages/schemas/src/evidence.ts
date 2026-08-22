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

/**
 * Allowed verdicts for an atomic claim–evidence review (AIT-05). The
 * application enforces this enum; the model may not invent verdicts.
 */
export const EvidenceVerdictSchema = z.enum([
  "SUPPORTS",
  "PARTIALLY_SUPPORTS",
  "CONTRADICTS",
  "INSUFFICIENT",
  "IRRELEVANT",
]);
export type EvidenceVerdict = z.infer<typeof EvidenceVerdictSchema>;

export const ClaimEvidenceLinkSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  /** Reference to a spec node of type `CLAIM` (or `PRIOR_WORK_FINDING`). */
  claimNodeId: UuidSchema,
  evidenceSpanId: UuidSchema,
  /** Deterministic integrity status, computed by the application. */
  integrityStatus: z.enum([
    "VALID",
    "INVALID_LINK",
    "INVALID_OFFSET",
    "EXACT_TEXT_MISMATCH",
    "MISSING_SOURCE",
  ]),
  /** Atomic AI review result; null until AIT-05 runs. */
  review: z
    .object({
      verdict: EvidenceVerdictSchema,
      reason: z.string().min(1).max(2_000),
      unsupportedAspects: z.array(z.string().min(1).max(500)).default([]),
    })
    .nullable(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type ClaimEvidenceLink = z.infer<typeof ClaimEvidenceLinkSchema>;

export const CreateClaimEvidenceLinkInputSchema = z.object({
  projectId: UuidSchema,
  claimNodeId: UuidSchema,
  evidenceSpanId: UuidSchema,
});
export type CreateClaimEvidenceLinkInput = z.infer<
  typeof CreateClaimEvidenceLinkInputSchema
>;

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

export const ListClaimEvidenceLinksInputSchema = z.object({
  projectId: UuidSchema,
  claimNodeId: UuidSchema.optional(),
});
export type ListClaimEvidenceLinksInput = z.infer<
  typeof ListClaimEvidenceLinksInputSchema
>;

export const ListClaimEvidenceLinksOutputSchema = z.object({
  items: z.array(ClaimEvidenceLinkSchema),
});
export type ListClaimEvidenceLinksOutput = z.infer<
  typeof ListClaimEvidenceLinksOutputSchema
>;

export const IntegrityCheckResultSchema = z.object({
  linkId: UuidSchema,
  integrityStatus: ClaimEvidenceLinkSchema.shape.integrityStatus,
});
export type IntegrityCheckResult = z.infer<typeof IntegrityCheckResultSchema>;

export const RunIntegrityChecksInputSchema = z.object({
  projectId: UuidSchema,
});
export type RunIntegrityChecksInput = z.infer<typeof RunIntegrityChecksInputSchema>;

export const RunIntegrityChecksOutputSchema = z.object({
  results: z.array(IntegrityCheckResultSchema),
});
export type RunIntegrityChecksOutput = z.infer<typeof RunIntegrityChecksOutputSchema>;

/**
 * Atomic claim–evidence review output (AIT-05). The verdict is constrained
 * to the allowed enum; the model may not invent verdicts (AI design §2.2).
 */
export const EvidenceReviewOutputSchema = z.object({
  verdict: EvidenceVerdictSchema,
  reason: z.string().min(1).max(500),
  unsupportedAspects: z.array(z.string().min(1).max(500)).default([]),
});
export type EvidenceReviewOutput = z.infer<typeof EvidenceReviewOutputSchema>;

export const RunEvidenceReviewInputSchema = z.object({
  projectId: UuidSchema,
  linkId: UuidSchema,
  /** The claim text to review. */
  claimText: z.string().min(1).max(2_000),
  /** The evidence span exact text. */
  evidenceText: z.string().min(1).max(10_000),
});
export type RunEvidenceReviewInput = z.infer<typeof RunEvidenceReviewInputSchema>;