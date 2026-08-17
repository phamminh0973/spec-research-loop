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
} from "@specloop/schemas";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../trpc/trpc.js";
import {
  generateQueries,
  searchWithAnalysis,
  search,
  importManual,
  listSources,
  selectSource,
  selectedCount,
} from "../modules/literature/service.js";

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
      return generateQueries({
        researchContext: input.researchContext,
        client: ctx.llm,
        model: ctx.llmConfig.defaultModel,
      });
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
      try {
        return await searchWithAnalysis({
          projectId: input.projectId,
          researchIdea: input.researchIdea,
          maxResults: input.maxResults,
          client: ctx.llm,
          model: ctx.llmConfig.defaultModel,
        });
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Search with analysis failed: ${(err as Error).message}`,
        });
      }
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
      return search({
        projectId: input.projectId,
        query: input.query,
        maxResults: input.maxResults,
      });
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
      try {
        return importManual({
          projectId: input.projectId,
          title: input.title,
          authors: input.authors,
          published: input.published,
          url: input.url,
          doi: input.doi,
          abstract: input.abstract,
          externalId: input.externalId,
        });
      } catch (err) {
        const message = (err as Error).message;
        if (message.includes("already exists")) {
          throw new TRPCError({
            code: "CONFLICT",
            message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Import manual failed: ${message}`,
        });
      }
    }),

  /**
   * List sources in a project's corpus, optionally filtered to the
   * selected subset. Cursor pagination mirrors `projects.list`.
   */
  list: publicProcedure
    .input(ListSourcesInputSchema)
    .output(ListSourcesOutputSchema)
    .query(({ input }) => {
      return listSources({
        projectId: input.projectId,
        selectedOnly: input.selectedOnly,
        limit: input.limit,
        cursor: input.cursor,
      });
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
      try {
        return selectSource({
          projectId: input.projectId,
          sourceId: input.sourceId,
          selected: input.selected,
        });
      } catch (err) {
        const message = (err as Error).message;
        if (message.includes("No sources found")) {
          throw new TRPCError({ code: "NOT_FOUND", message });
        }
        if (message.includes("not found")) {
          throw new TRPCError({ code: "NOT_FOUND", message });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Select source failed: ${message}`,
        });
      }
    }),

  /**
   * Convenience: count of selected sources for a project. Used by the
   * research-design module to enforce the corpus-bounded context boundary.
   */
  selectedCount: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .output(z.object({ count: z.number().int().min(0) }))
    .query(({ input }) => {
      return { count: selectedCount(input.projectId) };
    }),
});
