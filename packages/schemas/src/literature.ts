import { z } from "zod";

import { IsoTimestampSchema, UuidSchema } from "./common";

/**
 * Provenance tier for a source document. Mirrors the AI design §6/§7
 * distinction between API-sourced metadata and user-provided metadata.
 * The tier describes provenance/directness, not universal credibility.
 */
export const SourceProvenanceTierSchema = z.enum(["API", "MANUAL", "ABSTRACT"]);
export type SourceProvenanceTier = z.infer<typeof SourceProvenanceTierSchema>;

/**
 * LLM-proposed per-paper analysis (AIT-03), stored alongside the source so
 * it survives refetches. The arXiv metadata on the parent document is
 * verbatim; these three fields are PROPOSED analysis relative to the user's
 * research idea and must be reviewed by the user (AI design §17). Null for
 * sources that have not been analyzed.
 */
export const SourcePaperAnalysisSchema = z.object({
  achievedOutcome: z.string().min(1).max(2_000),
  methodology: z.string().min(1).max(2_000),
  additionalResearchNeeded: z.string().min(1).max(2_000),
});
export type SourcePaperAnalysis = z.infer<typeof SourcePaperAnalysisSchema>;

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
  /**
   * LLM-proposed analysis (methodology, shortcomings) relative to the
   * research idea; PROPOSED data pending user review. Null until an
   * analysis run attaches it.
   */
  analysis: SourcePaperAnalysisSchema.nullable().default(null),
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
    })
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
 * A paper returned by an LLM-driven arXiv search, annotated with three
 * fields derived relative to the user's original idea:
 *   - achievedOutcome: what the paper accomplished
 *   - methodology: how the paper approached it
 *   - additionalResearchNeeded: what gaps/follow-ups remain
 *
 * The arXiv metadata is sourced verbatim from the API; the three annotation
 * fields are LLM-proposed (PROPOSED data) and must be reviewed by the user
 * (AI design §17). The model never invents DOI/title metadata (§6).
 */
export const AnalyzedPaperSchema = z.object({
  externalId: z.string().min(1).max(200),
  title: z.string(),
  authors: z.array(z.string()),
  published: z.string().nullable(),
  url: z.string().url().nullable(),
  doi: z.string().nullable(),
  primaryCategory: z.string().nullable(),
  abstract: z.string(),
  achievedOutcome: z.string().min(1).max(2_000),
  methodology: z.string().min(1).max(2_000),
  additionalResearchNeeded: z.string().min(1).max(2_000),
});
export type AnalyzedPaper = z.infer<typeof AnalyzedPaperSchema>;

export const SearchWithAnalysisInputSchema = z.object({
  projectId: UuidSchema,
  /** The user's original research idea, used to drive the search + analysis. */
  researchIdea: z.string().min(1).max(20_000),
  /** Max papers to return; bounded per AI design §14. */
  maxResults: z.number().int().min(1).max(20).default(10),
});
export type SearchWithAnalysisInput = z.infer<
  typeof SearchWithAnalysisInputSchema
>;

export const SearchWithAnalysisOutputSchema = z.object({
  /** The arXiv query the LLM chose to run (for transparency/audit). */
  query: z.string(),
  papers: z.array(AnalyzedPaperSchema),
});
export type SearchWithAnalysisOutput = z.infer<
  typeof SearchWithAnalysisOutputSchema
>;
