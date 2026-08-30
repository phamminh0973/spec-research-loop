/**
 * Spec-generation router — Bước 8 ("Tạo bản research spec").
 *
 * Assembles the mandatory 14-section research specification from data
 * already produced by earlier steps (interpretation, decomposition,
 * literature, research-design, evidence). Deterministic, no LLM call.
 */

import {
  GenerateResearchSpecInputSchema,
  GetResearchSpecInputSchema,
  ListResearchSpecVersionsInputSchema,
  ListResearchSpecVersionsOutputSchema,
  ResearchSpecSchema,
} from "@specloop/schemas";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../trpc/trpc.js";
import {
  generateResearchSpec,
  getLatestResearchSpec,
  listResearchSpecVersions,
} from "../modules/spec-generation/service.js";

export const specGenerationRouter = router({
  /**
   * AIT-10 — Assemble a new research-spec version from the project's
   * current data. Requires a decomposition graph (Bước 2) to exist.
   */
  generate: publicProcedure
    .input(GenerateResearchSpecInputSchema)
    .output(ResearchSpecSchema)
    .mutation(async ({ input }) => {
      try {
        return await generateResearchSpec({ projectId: input.projectId });
      } catch (err) {
        const message = (err as Error).message;
        if (message.includes("Generate a decomposition graph")) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Spec assembly failed: ${message}`,
        });
      }
    }),

  /** Latest assembled version for a project, or null if none generated yet. */
  getLatest: publicProcedure
    .input(GetResearchSpecInputSchema)
    .output(ResearchSpecSchema.nullable())
    .query(({ input }) => getLatestResearchSpec(input.projectId)),

  /** All versions, oldest first — used by the Bước 10 version/diff view. */
  listVersions: publicProcedure
    .input(ListResearchSpecVersionsInputSchema)
    .output(ListResearchSpecVersionsOutputSchema)
    .query(({ input }) => ({ items: listResearchSpecVersions(input.projectId) })),
});
