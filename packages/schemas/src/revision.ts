import { z } from "zod";

import { IsoTimestampSchema, UuidSchema } from "./common";
import { JudgeNameSchema } from "./judge";
import { SpecSectionIdSchema } from "./spec-generation";

/**
 * Bước 10 — "Người dùng quyết định sửa đổi". The user is the sole
 * authority over what happens to a Judge finding; the app only records
 * the decision, it never resolves anything on the user's behalf.
 *
 *   RESOLVED  — the user acted on the finding (edited the underlying data
 *               elsewhere, e.g. narrowed a claim's scope) and wants it
 *               tracked as addressed.
 *   DISMISSED — the user reviewed it and consciously chose not to act,
 *               with a reason (mirrors the assignment's "Other" escape
 *               hatch — the user's own judgment always wins).
 *   DEFERRED  — acknowledged, left for a later revision pass.
 */
export const FindingResolutionKindSchema = z.enum([
  "RESOLVED",
  "DISMISSED",
  "DEFERRED",
]);
export type FindingResolutionKind = z.infer<typeof FindingResolutionKindSchema>;

export const RecordFindingResolutionInputSchema = z.object({
  projectId: UuidSchema,
  /** Must reference a finding in the project's latest Judge panel. */
  findingId: UuidSchema,
  resolution: FindingResolutionKindSchema,
  /** Required even for RESOLVED — the decision log needs to say what changed and why. */
  note: z.string().trim().min(1).max(2_000),
});
export type RecordFindingResolutionInput = z.infer<
  typeof RecordFindingResolutionInputSchema
>;

/** Persisted record. `judge` and `targetSection` are copied from the finding at decision time for a self-contained log entry. */
export const FindingResolutionSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  findingId: UuidSchema,
  judge: JudgeNameSchema,
  targetSection: z.string().trim().min(1).max(200),
  resolution: FindingResolutionKindSchema,
  note: z.string().trim().min(1).max(2_000),
  createdAt: IsoTimestampSchema,
});
export type FindingResolution = z.infer<typeof FindingResolutionSchema>;

/**
 * Re-run exactly one Judge — "chạy lại verifier liên quan" from the
 * assignment's Bước 10 loop, not the whole panel. The caller picks the
 * Judge whose area the user just edited (e.g. re-run EVIDENCE after fixing
 * a citation).
 */
export const RerunJudgeInputSchema = z.object({
  projectId: UuidSchema,
  judge: JudgeNameSchema,
});
export type RerunJudgeInput = z.infer<typeof RerunJudgeInputSchema>;

export const DiffResearchSpecVersionsInputSchema = z
  .object({
    projectId: UuidSchema,
    fromVersion: z.number().int().positive(),
    toVersion: z.number().int().positive(),
  })
  .superRefine((input, context) => {
    if (input.toVersion < input.fromVersion) {
      context.addIssue({
        code: "custom",
        path: ["toVersion"],
        message: "toVersion must be greater than or equal to fromVersion",
      });
    }
  });
export type DiffResearchSpecVersionsInput = z.infer<
  typeof DiffResearchSpecVersionsInputSchema
>;

export const SpecSectionDiffSchema = z.object({
  sectionId: SpecSectionIdSchema,
  title: z.string(),
  changed: z.boolean(),
  /** Null when the section did not exist in that version (should not happen post-P0, but kept honest). */
  before: z.string().nullable(),
  after: z.string().nullable(),
});
export type SpecSectionDiff = z.infer<typeof SpecSectionDiffSchema>;

export const DiffResearchSpecVersionsOutputSchema = z.object({
  fromVersion: z.number().int().positive(),
  toVersion: z.number().int().positive(),
  sections: z.array(SpecSectionDiffSchema),
});
export type DiffResearchSpecVersionsOutput = z.infer<
  typeof DiffResearchSpecVersionsOutputSchema
>;

export const FinalizeResearchSpecInputSchema = z.object({
  projectId: UuidSchema,
  version: z.number().int().positive(),
});
export type FinalizeResearchSpecInput = z.infer<
  typeof FinalizeResearchSpecInputSchema
>;

export const ListFindingResolutionsInputSchema = z.object({
  projectId: UuidSchema,
});
export type ListFindingResolutionsInput = z.infer<
  typeof ListFindingResolutionsInputSchema
>;

export const ListFindingResolutionsOutputSchema = z.object({
  items: z.array(FindingResolutionSchema),
});
export type ListFindingResolutionsOutput = z.infer<
  typeof ListFindingResolutionsOutputSchema
>;
