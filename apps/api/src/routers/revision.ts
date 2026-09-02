/**
 * Revision router — Bước 10 ("Người dùng quyết định sửa đổi").
 *
 * The user's own edits to claims/contributions/evidence go through their
 * respective routers (researchDesign, evidence, decomposition). This
 * router only wraps the decision loop around those edits: record a
 * decision on a Judge finding, re-run the one relevant Judge, diff spec
 * versions, and finalize.
 */

import {
  DiffResearchSpecVersionsInputSchema,
  DiffResearchSpecVersionsOutputSchema,
  FinalizeResearchSpecInputSchema,
  FindingResolutionSchema,
  JudgePanelResultSchema,
  ListFindingResolutionsInputSchema,
  ListFindingResolutionsOutputSchema,
  RecordFindingResolutionInputSchema,
  RerunJudgeInputSchema,
  ResearchSpecSchema,
} from "@specloop/schemas";
import { TRPCError } from "@trpc/server";
import {
  diffResearchSpecVersions,
  finalizeResearchSpec,
  listFindingResolutions,
  RevisionError,
  recordFindingResolution,
  rerunJudge,
} from "../modules/revision/service.js";
import { publicProcedure, router } from "../trpc/trpc.js";

function toTrpcError(err: unknown): TRPCError {
  if (err instanceof TRPCError) return err;
  if (err instanceof RevisionError) {
    return new TRPCError({
      code: "PRECONDITION_FAILED",
      message: err.message,
      cause: err,
    });
  }
  const message = err instanceof Error ? err.message : String(err);
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `Revision step failed: ${message}`,
    cause: err,
  });
}

export const revisionRouter = router({
  /** Log the user's decision (RESOLVED/DISMISSED/DEFERRED) about one Judge finding. */
  recordFindingResolution: publicProcedure
    .input(RecordFindingResolutionInputSchema)
    .output(FindingResolutionSchema)
    .mutation(({ input }) => {
      try {
        return recordFindingResolution(input);
      } catch (err) {
        throw toTrpcError(err);
      }
    }),

  /** All resolution decisions recorded for a project, oldest first. */
  listFindingResolutions: publicProcedure
    .input(ListFindingResolutionsInputSchema)
    .output(ListFindingResolutionsOutputSchema)
    .query(({ input }) => ({ items: listFindingResolutions(input.projectId) })),

  /** Re-run exactly one Judge and merge its fresh report into the existing panel. */
  rerunJudge: publicProcedure
    .input(RerunJudgeInputSchema)
    .output(JudgePanelResultSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await rerunJudge({
          projectId: input.projectId,
          judge: input.judge,
          client: ctx.llm,
          model: ctx.llmConfig.defaultModel,
        });
      } catch (err) {
        throw toTrpcError(err);
      }
    }),

  /** Section-by-section diff between two research-spec versions. */
  diffVersions: publicProcedure
    .input(DiffResearchSpecVersionsInputSchema)
    .output(DiffResearchSpecVersionsOutputSchema)
    .query(({ input }) => {
      try {
        return diffResearchSpecVersions(input);
      } catch (err) {
        throw toTrpcError(err);
      }
    }),

  /** User confirms the final version. Blocked only by an unresolved CRITICAL Judge finding. */
  finalize: publicProcedure
    .input(FinalizeResearchSpecInputSchema)
    .output(ResearchSpecSchema)
    .mutation(({ input }) => {
      try {
        return finalizeResearchSpec(input);
      } catch (err) {
        throw toTrpcError(err);
      }
    }),
});
