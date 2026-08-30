import { z } from "zod";

import { IsoTimestampSchema, UuidSchema } from "./common";

/**
 * The five independent Judges required by the assignment (Bước 9):
 * Gap, Contribution, Experiment, Evidence, Conference Readiness.
 * Each Judge evaluates the project's current spec context on its own —
 * it never receives another Judge's summary or findings as input.
 */
export const JudgeNameSchema = z.enum([
  "GAP",
  "CONTRIBUTION",
  "EXPERIMENT",
  "EVIDENCE",
  "CONFERENCE_READINESS",
]);
export type JudgeName = z.infer<typeof JudgeNameSchema>;

export const ALL_JUDGE_NAMES = [
  "GAP",
  "CONTRIBUTION",
  "EXPERIMENT",
  "EVIDENCE",
  "CONFERENCE_READINESS",
] as const satisfies readonly JudgeName[];

/**
 * Severity scale used in the assignment's own worked example
 * ("Mức độ: MAJOR."). CRITICAL blocks finalization, MAJOR should be
 * resolved before finalization, MINOR is advisory.
 */
export const FindingSeveritySchema = z.enum(["CRITICAL", "MAJOR", "MINOR"]);
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

/**
 * Shape the LLM must return for a single finding. Mirrors the assignment's
 * worked example structure: Vấn đề / Lý do / Mức độ / Đề xuất.
 */
export const FindingOutputSchema = z.object({
  /** Which spec section or artifact the finding is about, e.g. "Research gap", "Claim 2", "Baseline set". */
  targetSection: z.string().trim().min(1).max(200),
  severity: FindingSeveritySchema,
  /** "Vấn đề": what is wrong, stated concretely. */
  issue: z.string().trim().min(1).max(2_000),
  /** "Lý do": why it is a problem, grounded in the provided context. */
  reason: z.string().trim().min(1).max(2_000),
  /** "Đề xuất": a concrete, actionable fix. */
  recommendation: z.string().trim().min(1).max(2_000),
});
export type FindingOutput = z.infer<typeof FindingOutputSchema>;

/**
 * Raw structured-output contract for a single Judge call. Findings may be
 * empty when the Judge has no issue to raise in its area — the model must
 * never fabricate a finding to have something to say.
 */
export const JudgeCallOutputSchema = z.object({
  summary: z.string().trim().min(1).max(2_000),
  findings: z.array(FindingOutputSchema).max(20),
});
export type JudgeCallOutput = z.infer<typeof JudgeCallOutputSchema>;

/**
 * A persisted finding. `id` and `judge` are assigned by the application
 * after schema validation — the model never self-assigns judge identity,
 * consistent with the "model has no direct authority" rule used across
 * every other AI task in this codebase.
 */
export const FindingSchema = FindingOutputSchema.extend({
  id: UuidSchema,
  judge: JudgeNameSchema,
});
export type Finding = z.infer<typeof FindingSchema>;

/** One Judge's independent report within a panel run. */
export const JudgeReportSchema = z.object({
  judge: JudgeNameSchema,
  summary: z.string().trim().min(1).max(2_000),
  findings: z.array(FindingSchema),
});
export type JudgeReport = z.infer<typeof JudgeReportSchema>;

/**
 * Deterministic, application-computed aggregation across the five reports.
 * Never produced by an LLM — consensus is arithmetic over Judge output
 * that already exists, per AI design's "aggregation happens only after
 * individual findings exist" rule.
 */
export const ConsensusSchema = z.object({
  severityCounts: z.object({
    CRITICAL: z.number().int().nonnegative(),
    MAJOR: z.number().int().nonnegative(),
    MINOR: z.number().int().nonnegative(),
  }),
  /** Worst severity present across all findings; null when there are none. */
  overallSeverity: FindingSeveritySchema.nullable(),
  /** Sections flagged by two or more Judges independently — a cross-judge agreement signal. */
  agreedSections: z.array(z.string()).default([]),
  /** True when every Judge reported zero findings. */
  readyToFinalize: z.boolean(),
});
export type Consensus = z.infer<typeof ConsensusSchema>;

export const JudgePanelResultSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  judges: z.array(JudgeReportSchema).length(ALL_JUDGE_NAMES.length),
  consensus: ConsensusSchema,
  createdAt: IsoTimestampSchema,
});
export type JudgePanelResult = z.infer<typeof JudgePanelResultSchema>;

export const RunJudgePanelInputSchema = z.object({
  projectId: UuidSchema,
});
export type RunJudgePanelInput = z.infer<typeof RunJudgePanelInputSchema>;

export const GetJudgePanelInputSchema = z.object({
  projectId: UuidSchema,
});
export type GetJudgePanelInput = z.infer<typeof GetJudgePanelInputSchema>;
