/**
 * Literature router — UC-04 (Build literature corpus).
 *
 * Implements FR-06 ("Tìm kiếm, import và quản lý nguồn") and the literature
 * discovery flow from AI design §6:
 *
 * ```text
 * Confirmed research question
 * → AIT-03 queries
 * → one academic API (arXiv)
 * → normalize metadata
 * → deterministic deduplicate
 * → rank/shortlist
 * → user selection
 * → manual import fallback
 * ```
 *
 * The arXiv search is executed by {@link executeArxivSearch} — the single
 * place that talks to the arXiv API (AI design §16: the model has no direct
 * tool execution authority). This router never calls the LLM to perform the
 * search; it only invokes the application-side executor and persists the
 * normalized, deduplicated results.
 *
 * Persistence is in-memory for P0 (see `src/store/project-store.ts`).
 */

import {
  GenerateQueriesInputSchema,
  QueryGenerationOutputSchema,
  SearchSourcesInputSchema,
  SearchSourcesOutputSchema,
  SearchWithAnalysisInputSchema,
  SearchWithAnalysisOutputSchema,
  ImportManualSourceInputSchema,
  ListSourcesInputSchema,
  ListSourcesOutputSchema,
  SelectSourceInputSchema,
  SourceDocumentSchema,
  SourceProvenanceTierSchema,
  type QueryGenerationOutput,
  type SearchSourcesOutput,
  type SearchWithAnalysisOutput,
  type SourceDocument,
} from "@specloop/schemas";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { paperAnalysisPrompt, queryGenerationPrompt } from "../llm/prompts.js";
import { structuredCall } from "../llm/structured-call.js";
import { arxivSearchTool, executeArxivSearch } from "../llm/tools/arxiv-search.js";
import { executeLlmTool } from "../llm/tools/index.js";
import { publicProcedure, router } from "../trpc/trpc.js";
import {
  getOrCreate,
  parseOrThrow,
  sourcesByProject,
} from "../store/project-store.js";

/**
 * Normalize an arXiv search result into a `SourceDocument` record. Fields
 * are projected verbatim from the API output; nothing is synthesized. The
 * `externalId` is the arXiv id (no version) and is the deduplication key.
 */
function toSourceDocument(
  projectId: string,
  paper: {
    externalId: string;
    title: string;
    authors: string[];
    published: string | null;
    url: string | null;
    doi: string | null;
    primaryCategory: string | null;
    abstract: string;
  },
  now: string,
): SourceDocument {
  const id = crypto.randomUUID();
  return parseOrThrow(
    SourceDocumentSchema,
    {
      id,
      projectId,
      externalId: paper.externalId,
      provenanceTier: "API",
      title: paper.title,
      authors: paper.authors,
      published: paper.published,
      url: paper.url,
      doi: paper.doi,
      primaryCategory: paper.primaryCategory,
      abstract: paper.abstract,
      selected: false,
      createdAt: now,
      updatedAt: now,
    },
    "SourceDocument",
  );
}

/**
 * Deterministic deduplication by `externalId` within a project's corpus.
 * Returns the papers that are not already present and a count of dropped
 * duplicates. This is a pure function over the existing corpus + new results.
 */
function deduplicate(
  existing: SourceDocument[],
  candidates: SearchSourcesOutput["papers"],
): { kept: SearchSourcesOutput["papers"]; dropped: number } {
  const seen = new Set(existing.map((s) => s.externalId));
  const kept: SearchSourcesOutput["papers"] = [];
  let dropped = 0;
  for (const paper of candidates) {
    if (seen.has(paper.externalId)) {
      dropped += 1;
    } else {
      seen.add(paper.externalId);
      kept.push(paper);
    }
  }
  return { kept, dropped };
}

export const literatureRouter = router({
  /**
   * AIT-03 — Propose arXiv search queries from the confirmed research
   * context. The LLM only *suggests* queries; the application executes the
   * search via `literature.search` (AI design §6/§16: the model has no
   * direct tool execution authority). The user may edit/select queries
   * before running them.
   */
  generateQueries: publicProcedure
    .input(GenerateQueriesInputSchema)
    .output(QueryGenerationOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const output = await structuredCall<QueryGenerationOutput>({
        client: ctx.llm,
        model: ctx.llmConfig.defaultModel,
        systemPrompt: queryGenerationPrompt.system,
        userPrompt:
          "Propose arXiv search queries for the following research context. " +
          "Return 1–5 queries using arXiv query syntax.",
        untrusted: [
          { label: "Research context", text: input.researchContext },
        ],
        outputSchema: QueryGenerationOutputSchema,
      });
      return output;
    }),

  /**
   * LLM-driven arXiv search + per-paper analysis. The model is given the
   * `search_arxiv` tool and the user's research idea; it decides which
   * query to run. The application executes the tool call (AI design §16:
   * the model has no direct tool execution authority), feeds the papers
   * back, and then asks the model to produce three fields per paper
   * relative to the user's idea: achievedOutcome, methodology,
   * additionalResearchNeeded.
   *
   * The arXiv metadata is sourced verbatim from the API; the three
   * annotation fields are PROPOSED analysis the user reviews (§17). New
   * sources are deduplicated and persisted into the corpus.
   */
  searchWithAnalysis: publicProcedure
    .input(SearchWithAnalysisInputSchema)
    .output(SearchWithAnalysisOutputSchema)
    .mutation(async ({ input, ctx }) => {
      // Step 1: let the LLM choose an arXiv query via the search_arxiv tool.
      // The application executes the tool — the model only emits arguments.
      const toolResponse = await ctx.llm.chat.completions.create({
        model: ctx.llmConfig.defaultModel,
        messages: [
          {
            role: "system",
            content:
              "You are SpecLoop's literature search assistant. Use the " +
              "search_arxiv tool to find papers relevant to the user's " +
              "research idea. Choose a focused arXiv query (e.g. " +
              "'cat:cs.AI AND ti:agent'). Call the tool exactly once.",
          },
          {
            role: "user",
            content: input.researchIdea,
          },
        ],
        tools: [arxivSearchTool],
        tool_choice: "auto",
        max_tokens: 1_000,
      });

      const toolCall = toolResponse.choices[0]?.message?.tool_calls?.[0];
      if (
        !toolCall ||
        toolCall.type !== "function" ||
        toolCall.function.name !== "search_arxiv"
      ) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "The LLM did not issue a search_arxiv tool call. Retry or use " +
            "literature.search with an explicit query.",
        });
      }

      // Execute the tool call through the application-side executor. This is
      // the single place that talks to arXiv (§16). The args are validated
      // by the tool's Zod input schema inside executeLlmTool.
      const toolArgs = JSON.parse(toolCall.function.arguments);
      const arxivResult = (await executeLlmTool("search_arxiv", toolArgs)) as {
        query: string;
        papers: Array<{
          id: string;
          title: string;
          authors: string[];
          published: string;
          entryId: string;
          doi: string | null;
          primaryCategory: string | null;
          summary: string;
        }>;
      };

      const query = arxivResult.query;
      const papers = arxivResult.papers.slice(0, input.maxResults);

      // Step 2: persist deduplicated sources into the corpus.
      const existing = sourcesByProject.get(input.projectId) ?? [];
      const seen = new Set(existing.map((s) => s.externalId));
      const now = new Date().toISOString();
      const newSources: SourceDocument[] = [];
      for (const p of papers) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        newSources.push(
          toSourceDocument(
            input.projectId,
            {
              externalId: p.id,
              title: p.title,
              authors: p.authors,
              published: p.published,
              url: p.entryId,
              doi: p.doi,
              primaryCategory: p.primaryCategory,
              abstract: p.summary,
            },
            now,
          ),
        );
      }
      if (newSources.length > 0) {
        getOrCreate(sourcesByProject, input.projectId).push(...newSources);
      }

      // Step 3: ask the LLM to analyze each paper relative to the user's idea.
      // The paper metadata is passed as untrusted content (§16.2); the model
      // produces the three annotation fields as PROPOSED data.
      const corpusText = papers
        .map(
          (p) =>
            `Paper ${p.id}: ${p.title}\nAuthors: ${p.authors.join(", ")}\n` +
            `Published: ${p.published}\nDOI: ${p.doi ?? "none"}\n` +
            `Category: ${p.primaryCategory ?? "none"}\nAbstract: ${p.summary}`,
        )
        .join("\n\n---\n\n");

      const allowedIds = new Set(papers.map((p) => p.id));
      const analysis = await structuredCall<SearchWithAnalysisOutput>({
        client: ctx.llm,
        model: ctx.llmConfig.defaultModel,
        systemPrompt: paperAnalysisPrompt.system,
        userPrompt:
          "Analyze each paper below relative to the user's research idea. " +
          "For each paper produce achievedOutcome, methodology, and " +
          "additionalResearchNeeded. Only describe papers actually returned " +
          "by the search; do not invent papers.",
        untrusted: [
          { label: "User's research idea", text: input.researchIdea },
          { label: "arXiv search results", text: corpusText },
        ],
        outputSchema: SearchWithAnalysisOutputSchema,
        allowedIds,
        extractReferencedIds: (out) =>
          out.papers.map((p) => p.externalId),
      });

      // Attach the query the LLM chose, for transparency/audit.
      return { query, papers: analysis.papers };
    }),

  /**
   * Search arXiv, normalize and deduplicate against the existing corpus,
   * persist new sources, and return the normalized papers. The user then
   * selects which sources form the active corpus via `literature.select`.
   */
  search: publicProcedure
    .input(SearchSourcesInputSchema)
    .output(SearchSourcesOutputSchema)
    .mutation(async ({ input }) => {
      // Execute the arXiv search through the application-side executor.
      // The model never calls arXiv directly.
      const arxivResult = await executeArxivSearch({
        query: input.query,
        maxResults: input.maxResults,
        sortBy: "relevance",
      });

      // Normalize arXiv papers into the corpus paper shape.
      const papers: SearchSourcesOutput["papers"] = arxivResult.papers.map(
        (p) => ({
          externalId: p.id,
          title: p.title,
          authors: p.authors,
          published: p.published,
          url: p.entryId,
          doi: p.doi,
          primaryCategory: p.primaryCategory,
          abstract: p.summary,
        }),
      );

      const existing = sourcesByProject.get(input.projectId) ?? [];
      const { kept, dropped } = deduplicate(existing, papers);

      const now = new Date().toISOString();
      const newSources = kept.map((p) => toSourceDocument(input.projectId, p, now));
      if (newSources.length > 0) {
        getOrCreate(sourcesByProject, input.projectId).push(...newSources);
      }

      return { papers: kept, duplicatesDropped: dropped };
    }),

  /**
   * Manual import fallback for when the academic API is unavailable or the
   * source is not on arXiv (AI design §6: "manual import fallback"). The
   * record is stored with provenance tier `MANUAL` (or `ABSTRACT` when only
   * an abstract is provided) and deduplicated against the corpus.
   */
  importManual: publicProcedure
    .input(ImportManualSourceInputSchema)
    .output(SourceDocumentSchema)
    .mutation(({ input }) => {
      const existing = sourcesByProject.get(input.projectId) ?? [];
      const externalId =
        input.externalId ?? `manual:${crypto.randomUUID()}`;
      if (existing.some((s) => s.externalId === externalId)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A source with externalId "${externalId}" already exists in this project.`,
        });
      }

      const now = new Date().toISOString();
      const tier = SourceProvenanceTierSchema.parse(
        input.abstract && input.abstract.length > 0 && !input.url
          ? "ABSTRACT"
          : "MANUAL",
      );
      const record = parseOrThrow(
        SourceDocumentSchema,
        {
          id: crypto.randomUUID(),
          projectId: input.projectId,
          externalId,
          provenanceTier: tier,
          title: input.title,
          authors: input.authors,
          published: input.published,
          url: input.url,
          doi: input.doi,
          primaryCategory: null,
          abstract: input.abstract,
          selected: false,
          createdAt: now,
          updatedAt: now,
        },
        "SourceDocument",
      );
      getOrCreate(sourcesByProject, input.projectId).push(record);
      return record;
    }),

  /**
   * List sources in a project's corpus, optionally filtered to the
   * selected subset. Cursor pagination mirrors `projects.list`.
   */
  list: publicProcedure
    .input(ListSourcesInputSchema)
    .output(ListSourcesOutputSchema)
    .query(({ input }) => {
      const all = (sourcesByProject.get(input.projectId) ?? []).filter(
        (s) => !input.selectedOnly || s.selected,
      );
      const startIndex = input.cursor
        ? all.findIndex((s) => s.id === input.cursor) + 1
        : 0;
      const page = all.slice(startIndex, startIndex + input.limit);
      const nextCursor =
        startIndex + input.limit < all.length
          ? (page[page.length - 1]?.id ?? null)
          : null;
      return { items: page, nextCursor };
    }),

  /**
   * Select or deselect a source into the active corpus. Selection is a
   * human confirmation point (AI design §17): the user validates the
   * corpus; the AI never auto-selects sources.
   */
  select: publicProcedure
    .input(SelectSourceInputSchema)
    .output(SourceDocumentSchema)
    .mutation(({ input }) => {
      const list = sourcesByProject.get(input.projectId);
      if (!list) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `No sources found for project ${input.projectId}.`,
        });
      }
      const source = list.find((s) => s.id === input.sourceId);
      if (!source) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Source ${input.sourceId} not found in project ${input.projectId}.`,
        });
      }
      source.selected = input.selected;
      source.updatedAt = new Date().toISOString();
      return parseOrThrow(SourceDocumentSchema, source, "SourceDocument");
    }),

  /**
   * Convenience: count of selected sources for a project. Used by the
   * research-design module to enforce the corpus-bounded context boundary.
   */
  selectedCount: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .output(z.object({ count: z.number().int().min(0) }))
    .query(({ input }) => {
      const list = sourcesByProject.get(input.projectId) ?? [];
      return { count: list.filter((s) => s.selected).length };
    }),
});
