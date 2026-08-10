/**
 * arXiv search tool for OpenAI-compatible function calling.
 *
 * This module exposes an LLM tool that lets a model *propose* an arXiv
 * search, while the application — not the model — actually executes it.
 * This respects `docs/04-ai-system-design.md` §16 ("Model receives no
 * direct tool execution authority"): the model only emits structured
 * arguments, and {@link executeArxivSearch} is the single place that
 * talks to the arXiv API.
 *
 * The tool is shaped to match the OpenAI tool-calling format
 * (`type: "function"` with a JSON-Schema `parameters` object) so it can
 * be passed verbatim to `openai.chat.completions.create({ tools: [...] })`.
 *
 * The arXiv API itself is called through `@everdeep/arxiv`, the single
 * configured academic API for P0 (see `docs/04-ai-system-design.md` §6:
 * "one academic API"). A second academic API and Crossref DOI verification
 * are P1 and out of scope here.
 *
 * Provenance: every field returned to the model is sourced verbatim from
 * the arXiv `Result`. The model is explicitly forbidden from inventing
 * DOI/metadata (see the tool description); the application never enriches
 * results with fabricated fields.
 */

import {
  Client,
  Search,
  SortCriterion,
  type Result,
} from "@everdeep/arxiv";
import { z } from "zod";

// ---------------------------------------------------------------------------
// OpenAI tool definition
// ---------------------------------------------------------------------------

/**
 * arXiv sort criteria exposed to the model. Mirrors `SortCriterion` from
 * `@everdeep/arxiv` (which mirrors the arXiv API `sortBy` values).
 */
export const ARXIV_SORT_CRITERIA = [
  "relevance",
  "lastUpdatedDate",
  "submittedDate",
] as const satisfies readonly SortCriterion[];

export type ArxivSortCriterion = (typeof ARXIV_SORT_CRITERIA)[number];

/**
 * Input schema for the `search_arxiv` tool. Validated with Zod so the
 * application can reject malformed model output before it reaches the
 * network — the model never gets to send an arbitrary query string to
 * arXiv unchecked.
 *
 * `query` is a raw arXiv query string (e.g. `cat:cs.AI AND ti:agent`).
 * See https://arxiv.org/help/api/user-manual#query_details.
 */
export const ArxivSearchInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(2_000)
    .describe(
      "Raw arXiv query string, e.g. 'cat:cs.AI AND ti:agent'. " +
        "See https://arxiv.org/help/api/user-manual#query_details.",
    ),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .describe("Maximum number of papers to return. 1–50."),
  sortBy: z
    .enum(ARXIV_SORT_CRITERIA)
    .default("relevance")
    .describe("Result ordering: relevance, lastUpdatedDate, or submittedDate."),
});
export type ArxivSearchInput = z.infer<typeof ArxivSearchInputSchema>;

/**
 * A single arXiv paper as returned to the model. Only fields that are
 * present on the arXiv `Result` are included — nothing is synthesized.
 */
export const ArxivPaperSchema = z.object({
  id: z.string().describe("arXiv id, e.g. 2301.00001 (no version)."),
  shortId: z
    .string()
    .describe("arXiv id with version, e.g. 2301.00001v2."),
  entryId: z
    .string()
    .url()
    .describe("Canonical abstract page URL, e.g. https://arxiv.org/abs/2301.00001v2."),
  title: z.string(),
  summary: z.string(),
  authors: z.array(z.string()),
  published: z.string().describe("ISO 8601 publication timestamp."),
  updated: z.string().describe("ISO 8601 last-update timestamp."),
  primaryCategory: z.string().nullable(),
  categories: z.array(z.string()),
  pdfUrl: z.string().url().nullable(),
  htmlUrl: z.string().url().nullable(),
  doi: z.string().nullable(),
  journalRef: z.string().nullable(),
  comment: z.string().nullable(),
});
export type ArxivPaper = z.infer<typeof ArxivPaperSchema>;

export const ArxivSearchOutputSchema = z.object({
  query: z.string(),
  sortBy: z.enum(ARXIV_SORT_CRITERIA),
  total: z.number().int().min(0).describe("Number of papers returned."),
  papers: z.array(ArxivPaperSchema),
});
export type ArxivSearchOutput = z.infer<typeof ArxivSearchOutputSchema>;

/**
 * The OpenAI-format tool definition. Pass this directly to
 * `openai.chat.completions.create({ tools: [arxivSearchTool] })`.
 *
 * `function.parameters` is derived from {@link ArxivSearchInputSchema} via
 * Zod 4's built-in `z.toJSONSchema` (targets JSON Schema Draft 2020-12,
 * which OpenAI's tool-calling API accepts). This keeps the OpenAI-facing
 * JSON Schema and the runtime-validated Zod schema in lockstep — a single
 * source of truth — so the model can never be offered a parameter shape
 * that the executor would reject.
 */
export const arxivSearchTool = {
  type: "function" as const,
  function: {
    name: "search_arxiv",
    description:
      "Search the arXiv preprint repository for papers matching a query. " +
      "Returns normalized paper metadata (title, authors, abstract, " +
      "categories, links, optional DOI). Use this to find candidate " +
      "sources for a research corpus. Never invent DOI values, paper " +
      "titles, or metadata that this tool did not return.",
    parameters: z.toJSONSchema(ArxivSearchInputSchema),
  },
} as const;

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------

/**
 * Shared arXiv client. Defaults follow arXiv API etiquette (3s delay,
 * bounded retries) per `@everdeep/arxiv`. A single instance is reused
 * across the process so rate limiting is global, matching the Python
 * `arxiv` package semantics.
 */
let cachedClient: Client | undefined;

export function getArxivClient(): Client {
  if (cachedClient) return cachedClient;
  cachedClient = new Client({
    pageSize: 100,
    delayMs: 3_000,
    maxRetries: 3,
    userAgent: "SpecResearch-Loop/0.0.0 (https://github.com/specloop)",
  });
  return cachedClient;
}

/** Test-only escape hatch to drop the memoized client. */
export function resetArxivClient(): void {
  cachedClient = undefined;
}

/**
 * Project a `@everdeep/arxiv` `Result` into the plain object shape the
 * model receives. Dates are serialized as ISO strings; URLs and optional
 * bibliographic fields are passed through verbatim and left `null` when
 * arXiv did not provide them — never fabricated.
 */
function toPaper(result: Result): ArxivPaper {
  return {
    id: result.id,
    shortId: result.shortId,
    entryId: result.entryId,
    title: result.title,
    summary: result.summary,
    authors: result.authors.map((a) => a.name),
    published: result.published.toISOString(),
    updated: result.updated.toISOString(),
    primaryCategory: result.primaryCategory ?? null,
    categories: [...result.categories],
    pdfUrl: result.pdfUrl ?? null,
    htmlUrl: result.htmlUrl ?? null,
    doi: result.doi ?? null,
    journalRef: result.journalRef ?? null,
    comment: result.comment ?? null,
  };
}

/**
 * Execute the `search_arxiv` tool against the arXiv API.
 *
 * This is the only function in the codebase that performs a network call
 * to arXiv. It validates the model-provided arguments with
 * {@link ArxivSearchInputSchema} before any request is made, so a
 * malformed tool call never reaches the network.
 *
 * @throws {z.ZodError} if `args` do not match the input schema.
 * @throws {Error} if the arXiv API returns an error (see `@everdeep/arxiv`
 *   `HttpError` / `UnexpectedEmptyPageError`).
 */
export async function executeArxivSearch(
  args: unknown,
  client: Client = getArxivClient(),
): Promise<ArxivSearchOutput> {
  const input = ArxivSearchInputSchema.parse(args);
  const search = new Search({
    query: input.query,
    maxResults: input.maxResults,
    sortBy: input.sortBy,
  });

  const results = await client.search(search);
  const papers = results.map(toPaper);

  return {
    query: input.query,
    sortBy: input.sortBy,
    total: papers.length,
    papers,
  };
}

/**
 * Registry of LLM tools exposed by SpecLoop. Each entry pairs the
 * OpenAI-format definition (for the request) with the executor (for the
 * application-side response). Add new tools here as they land.
 */
export interface LlmTool<TInput = unknown, TOutput = unknown> {
  definition: { type: "function"; function: { name: string } };
  execute: (args: TInput) => Promise<TOutput>;
}

export const arxivSearchLlmTool: LlmTool<unknown, ArxivSearchOutput> = {
  definition: arxivSearchTool,
  execute: (args) => executeArxivSearch(args),
};
