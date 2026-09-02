import { z } from "zod";

import { IsoTimestampSchema, UuidSchema } from "./common";
import { EvidenceRequirementSchema } from "./evidence";

/**
 * A corpus-bounded gap candidate (AIT-06). Always carries a novelty-risk
 * warning per BR-04: "Không được bao phủ trong corpus hiện tại không đồng
 * nghĩa novelty toàn cầu."
 */
export const GapCandidateSchema = z.object({
  knownCapability: z.string().min(1).max(2_000),
  limitation: z.string().min(1).max(2_000),
  importance: z.string().min(1).max(2_000),
  testableHypothesis: z.string().min(1).max(2_000),
  /** References to source documents in the selected corpus. */
  evidenceRefs: z.array(UuidSchema).default([]),
  nearestWorkIds: z.array(UuidSchema).default([]),
  noveltyRisk: z.string().min(1).max(2_000),
  scope: z.string().min(1).max(2_000),
});
export type GapCandidate = z.infer<typeof GapCandidateSchema>;

export const GapProposalOutputSchema = z.object({
  candidates: z.array(GapCandidateSchema),
  /** Always present; warns that gap is corpus-bounded, not global novelty. */
  warning: z.string().min(1).max(2_000),
});
export type GapProposalOutput = z.infer<typeof GapProposalOutputSchema>;

export const ClaimTypeSchema = z.enum([
  "EMPIRICAL",
  "METHODOLOGICAL",
  "THEORETICAL",
  "NEGATIVE",
]);
export type ClaimType = z.infer<typeof ClaimTypeSchema>;

/**
 * An atomic, falsifiable claim (AIT-07). Separates the claim text from its
 * scope, baseline, metric and falsification condition so experiments can
 * test it deterministically.
 */
export const AtomicClaimSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  type: ClaimTypeSchema,
  text: z.string().min(1).max(2_000),
  scope: z.string().min(1).max(2_000),
  baseline: z.string().min(1).max(2_000),
  datasetDomain: z.string().min(1).max(2_000),
  metric: z.string().min(1).max(2_000),
  expectedDirection: z.string().min(1).max(2_000),
  falsificationCondition: z.string().min(1).max(2_000),
  evidenceRefs: z.array(UuidSchema).default([]),
  experimentRefs: z.array(UuidSchema).default([]),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type AtomicClaim = z.infer<typeof AtomicClaimSchema>;

export const ContributionSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  text: z.string().min(1).max(2_000),
  claimIds: z.array(UuidSchema).default([]),
  createdAt: IsoTimestampSchema,
});
export type Contribution = z.infer<typeof ContributionSchema>;

export const ClaimDesignOutputSchema = z.object({
  contributions: z.array(
    z.object({
      text: z.string().min(1).max(2_000),
      claimIds: z.array(UuidSchema).default([]),
    })
  ),
  claims: z.array(
    z.object({
      type: ClaimTypeSchema,
      text: z.string().min(1).max(2_000),
      scope: z.string().min(1).max(2_000),
      baseline: z.string().min(1).max(2_000),
      datasetDomain: z.string().min(1).max(2_000),
      metric: z.string().min(1).max(2_000),
      expectedDirection: z.string().min(1).max(2_000),
      falsificationCondition: z.string().min(1).max(2_000),
      evidenceRefs: z.array(UuidSchema).default([]),
      experimentRefs: z.array(UuidSchema).default([]),
    })
  ),
});
export type ClaimDesignOutput = z.infer<typeof ClaimDesignOutputSchema>;

/**
 * Merged response for the combined Generate contributions & claims + evidence
 * step. Claims are generated from the selected gap (AIT-07) and evidence
 * requirements — what the metric value must satisfy for the claim to be
 * verified — are auto-generated deterministically so the user does not have
 * to run a second process manually. The LLM-backed
 * `evidence.generateEvidenceForClaim` remains available for per-claim
 * regeneration.
 */
export const GenerateClaimDesignWithEvidenceOutputSchema =
  ClaimDesignOutputSchema.extend({
    evidenceRequirements: z.array(EvidenceRequirementSchema).default([]),
  });
export type GenerateClaimDesignWithEvidenceOutput = z.infer<
  typeof GenerateClaimDesignWithEvidenceOutputSchema
>;

/**
 * Resource estimate for an experiment plan. Inputs are labeled assumed or
 * measured; the system never fabricates provider prices or throughput
 * (AI design §8).
 */
export const ResourceEstimateSchema = z.object({
  label: z.string().min(1).max(200),
  formula: z.string().min(1).max(2_000),
  /** Whether each input value is `assumed` or `measured`. */
  inputs: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        value: z.string().min(1).max(2_000),
        basis: z.enum(["assumed", "measured"]),
      })
    )
    .default([]),
  /** Result of the formula; labeled estimated unless reconciled. */
  result: z.string().min(1).max(2_000),
});
export type ResourceEstimate = z.infer<typeof ResourceEstimateSchema>;

export const ExperimentPlanSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  /** B0 = trivial/baseline-only, B1 = minimal viable, proposed = full plan. */
  tier: z.enum(["B0", "B1", "PROPOSED"]),
  baselines: z.array(z.string().min(1).max(2_000)).default([]),
  metrics: z.array(z.string().min(1).max(2_000)).default([]),
  protocol: z.array(z.string().min(1).max(2_000)).default([]),
  controls: z.array(z.string().min(1).max(2_000)).default([]),
  /** At least one important ablation is required (AI design §8). */
  ablations: z.array(z.string().min(1).max(2_000)).default([]),
  generalizationProposals: z.array(z.string().min(1).max(2_000)).default([]),
  assumptions: z.array(z.string().min(1).max(2_000)).default([]),
  estimates: z.array(ResourceEstimateSchema).default([]),
  claimIds: z.array(UuidSchema).default([]),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type ExperimentPlan = z.infer<typeof ExperimentPlanSchema>;

export const ExperimentPlanOutputSchema = z.object({
  baselines: z.array(z.string().min(1).max(2_000)).default([]),
  metrics: z.array(z.string().min(1).max(2_000)).default([]),
  protocol: z.array(z.string().min(1).max(2_000)).default([]),
  controls: z.array(z.string().min(1).max(2_000)).default([]),
  ablations: z.array(z.string().min(1).max(2_000)).default([]),
  generalizationProposals: z.array(z.string().min(1).max(2_000)).default([]),
  assumptions: z.array(z.string().min(1).max(2_000)).default([]),
  estimates: z.array(ResourceEstimateSchema).default([]),
});
export type ExperimentPlanOutput = z.infer<typeof ExperimentPlanOutputSchema>;

export const GenerateGapProposalInputSchema = z.object({
  projectId: UuidSchema,
  /** Research question node ids whose confirmed text feeds the gap proposal. */
  researchQuestionNodeIds: z.array(UuidSchema).default([]),
});
export type GenerateGapProposalInput = z.infer<
  typeof GenerateGapProposalInputSchema
>;

export const GenerateClaimDesignInputSchema = z.object({
  projectId: UuidSchema,
  /** Selected gap candidate index from the most recent proposal. */
  selectedGapIndex: z.number().int().nonnegative(),
});
export type GenerateClaimDesignInput = z.infer<
  typeof GenerateClaimDesignInputSchema
>;

export const GenerateExperimentPlanInputSchema = z.object({
  projectId: UuidSchema,
  claimIds: z.array(UuidSchema).default([]),
  tier: z.enum(["B0", "B1", "PROPOSED"]).default("PROPOSED"),
});
export type GenerateExperimentPlanInput = z.infer<
  typeof GenerateExperimentPlanInputSchema
>;

export const ListAtomicClaimsInputSchema = z.object({
  projectId: UuidSchema,
});
export type ListAtomicClaimsInput = z.infer<typeof ListAtomicClaimsInputSchema>;

export const ListAtomicClaimsOutputSchema = z.object({
  items: z.array(AtomicClaimSchema),
});
export type ListAtomicClaimsOutput = z.infer<
  typeof ListAtomicClaimsOutputSchema
>;

export const ListExperimentPlansInputSchema = z.object({
  projectId: UuidSchema,
});
export type ListExperimentPlansInput = z.infer<
  typeof ListExperimentPlansInputSchema
>;

export const ListExperimentPlansOutputSchema = z.object({
  items: z.array(ExperimentPlanSchema),
});
export type ListExperimentPlansOutput = z.infer<
  typeof ListExperimentPlansOutputSchema
>;
