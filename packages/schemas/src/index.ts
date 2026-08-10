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
// Literature corpus (UC-04 / FR-06 / FR-07)
// ---------------------------------------------------------------------------

/**
 * Provenance tier for a source document. Mirrors the AI design §6/§7
 * distinction between API-sourced metadata and user-provided metadata.
 * The tier describes provenance/directness, not universal credibility.
 */
export const SourceProvenanceTierSchema = z.enum([
  "API",
  "MANUAL",
  "ABSTRACT",
]);
export type SourceProvenanceTier = z.infer<typeof SourceProvenanceTierSchema>;

/**
 * A normalized scholarly source stored in a project's corpus. Fields are
 * sourced verbatim from the academic API or from user-provided manual
 * metadata; the application never synthesizes fields the API did not
 * return (AI design §6: "LLM may propose queries and summarize selected
 * records but cannot invent DOI/metadata").
 */
export const SourceDocumentSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  /** Stable external identifier used for deduplication, e.g. arXiv id. */
  externalId: z.string().min(1).max(200),
  /** Origin of the record. `API` for arXiv, `MANUAL`/`ABSTRACT` for fallback. */
  provenanceTier: SourceProvenanceTierSchema,
  title: z.string().min(1).max(500),
  authors: z.array(z.string().min(1).max(200)),
  /** ISO 8601 publication timestamp; null when the source did not provide one. */
  published: z.string().nullable(),
  /** Canonical abstract page URL when known. */
  url: z.string().url().nullable(),
  /** DOI when the source provided one; never fabricated. */
  doi: z.string().nullable(),
  /** Primary category (e.g. arXiv `cs.AI`); null when absent. */
  primaryCategory: z.string().nullable(),
  /** Abstract text; may be empty for manual imports. */
  abstract: z.string().max(20_000).default(""),
  /** Whether the user has selected this source into the active corpus. */
  selected: z.boolean().default(false),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type SourceDocument = z.infer<typeof SourceDocumentSchema>;

export const SearchSourcesInputSchema = z.object({
  projectId: UuidSchema,
  /** Raw arXiv query string, e.g. `cat:cs.AI AND ti:agent`. */
  query: z.string().min(1).max(2_000),
  maxResults: z.number().int().min(1).max(50).default(10),
});
export type SearchSourcesInput = z.infer<typeof SearchSourcesInputSchema>;

export const SearchSourcesOutputSchema = z.object({
  /** Papers returned by the academic API, normalized and deduplicated. */
  papers: z.array(
    z.object({
      externalId: z.string(),
      title: z.string(),
      authors: z.array(z.string()),
      published: z.string().nullable(),
      url: z.string().url().nullable(),
      doi: z.string().nullable(),
      primaryCategory: z.string().nullable(),
      abstract: z.string(),
    }),
  ),
  /** Number of results dropped as duplicates of existing corpus sources. */
  duplicatesDropped: z.number().int().min(0),
});
export type SearchSourcesOutput = z.infer<typeof SearchSourcesOutputSchema>;

export const ImportManualSourceInputSchema = z.object({
  projectId: UuidSchema,
  title: z.string().min(1).max(500),
  authors: z.array(z.string().min(1).max(200)).max(50).default([]),
  published: z.string().nullable().default(null),
  url: z.string().url().nullable().default(null),
  doi: z.string().nullable().default(null),
  abstract: z.string().max(20_000).default(""),
  /** External id for dedup; defaults to a generated value when omitted. */
  externalId: z.string().min(1).max(200).optional(),
});
export type ImportManualSourceInput = z.infer<
  typeof ImportManualSourceInputSchema
>;

export const ListSourcesInputSchema = z.object({
  projectId: UuidSchema,
  selectedOnly: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: UuidSchema.optional(),
});
export type ListSourcesInput = z.infer<typeof ListSourcesInputSchema>;

export const ListSourcesOutputSchema = z.object({
  items: z.array(SourceDocumentSchema),
  nextCursor: UuidSchema.nullable(),
});
export type ListSourcesOutput = z.infer<typeof ListSourcesOutputSchema>;

export const SelectSourceInputSchema = z.object({
  projectId: UuidSchema,
  sourceId: UuidSchema,
  selected: z.boolean(),
});
export type SelectSourceInput = z.infer<typeof SelectSourceInputSchema>;

// ---------------------------------------------------------------------------
// Evidence spans and claim–evidence links (UC-05 / FR-08 / FR-09 / FR-13)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Research design (UC-06 / FR-11 / FR-12 / FR-14)
// ---------------------------------------------------------------------------

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
  "METHODLOGICAL",
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
    }),
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
    }),
  ),
});
export type ClaimDesignOutput = z.infer<typeof ClaimDesignOutputSchema>;

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
      }),
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
export type ListAtomicClaimsOutput = z.infer<typeof ListAtomicClaimsOutputSchema>;

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

// ---------------------------------------------------------------------------
// LLM-proposed suggestions (AIT-03 query generation, AIT-05 evidence review)
// ---------------------------------------------------------------------------

/**
 * A single arXiv search query proposed by the LLM (AIT-03). The model only
 * proposes queries; the application executes the search (AI design §6/§16).
 */
export const ProposedQuerySchema = z.object({
  query: z.string().min(1).max(2_000),
  rationale: z.string().min(1).max(1_000),
  targetConcept: z.string().min(1).max(500),
});
export type ProposedQuery = z.infer<typeof ProposedQuerySchema>;

export const QueryGenerationOutputSchema = z.object({
  queries: z.array(ProposedQuerySchema).min(1).max(5),
});
export type QueryGenerationOutput = z.infer<typeof QueryGenerationOutputSchema>;

export const GenerateQueriesInputSchema = z.object({
  projectId: UuidSchema,
  /** Confirmed research questions / idea text that feed query generation. */
  researchContext: z.string().min(1).max(20_000),
});
export type GenerateQueriesInput = z.infer<typeof GenerateQueriesInputSchema>;

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
export type RunEvidenceReviewInput = z.infer<
  typeof RunEvidenceReviewInputSchema
>;

/**
 * An evidence span proposed by the LLM (AIT-05-propose). The model suggests
 * which excerpt of a source abstract supports a given claim; the user
 * confirms/edits before the span is stored as `EXACT`/`MANUAL` evidence.
 * The model never rewrites the exact text (AI design §7.1).
 */
export const ProposedEvidenceSpanSchema = z.object({
  sourceId: UuidSchema,
  /** Verbatim excerpt from the source; not rewritten by the model. */
  exactText: z.string().min(1).max(10_000),
  /** Why this excerpt supports the claim (concise rationale). */
  rationale: z.string().min(1).max(1_000),
  /** Suggested entry type; the application validates offsets for EXACT. */
  entryType: EvidenceEntryTypeSchema,
});
export type ProposedEvidenceSpan = z.infer<typeof ProposedEvidenceSpanSchema>;

export const ProposeEvidenceSpansInputSchema = z.object({
  projectId: UuidSchema,
  /** The claim text to find evidence for. */
  claimText: z.string().min(1).max(2_000),
});
export type ProposeEvidenceSpansInput = z.infer<
  typeof ProposeEvidenceSpansInputSchema
>;

export const ProposeEvidenceSpansOutputSchema = z.object({
  proposals: z.array(ProposedEvidenceSpanSchema),
});
export type ProposeEvidenceSpansOutput = z.infer<
  typeof ProposeEvidenceSpansOutputSchema
>;
