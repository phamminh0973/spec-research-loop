/**
 * Judge router — Bước 9–10 (Independent Judges & user revision decision).
 *
 * Implements AR-12/AR-13/FR-16/FR-17: run the five independent Judges
 * (Gap, Contribution, Experiment, Evidence, Conference Readiness) over the
 * project's current spec context and expose the deterministic consensus.
 *
 * The Judge panel is *review* data, not authority over the spec itself —
 * the user still decides what to change (Bước 10 / revision router). This
 * router only runs the panel and lets it be read back.
 *
 * Persistence is in-memory for P0 (see `src/store/project-store.ts`).
 */

import {
  GetJudgePanelInputSchema,
  JudgePanelResultSchema,
  RunJudgePanelInputSchema,
} from "@specloop/schemas";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../trpc/trpc.js";
import { runJudgePanel } from "../modules/judge/service.js";
import { judgePanelsByProject } from "../store/project-store.js";

export const judgeRouter = router({
  /**
   * AIT-09 — Run all five Judges independently (in parallel) over the
   * project's current spec context, then compute deterministic consensus.
   * Requires a decomposition graph (Bước 2) to already exist.
   */
  runPanel: publicProcedure
    .input(RunJudgePanelInputSchema)
    .output(JudgePanelResultSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await runJudgePanel({
          projectId: input.projectId,
          client: ctx.llm,
          model: ctx.llmConfig.defaultModel,
        });
      } catch (err) {
        const message = (err as Error).message;
        if (message.includes("Generate a decomposition graph")) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Judge panel failed: ${message}`,
        });
      }
    }),

  /** Read the most recent Judge panel result for a project, if any has run. */
  getLatestPanel: publicProcedure
    .input(GetJudgePanelInputSchema)
    .output(JudgePanelResultSchema.nullable())
    .query(({ input }) => {
      return judgePanelsByProject.get(input.projectId) ?? null;
    }),
});
