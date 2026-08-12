/**
 * Interpretation router (US-02 / AIT-01 / Bước 1 — Idea interpretation).
 *
 * Exposes one mutation:
 *
 *   - `interpretation.generate` → run AIT-01 for an existing project's raw
 *     idea and return a `PROPOSED` interpretation. The caller (web app) is
 *     responsible for surfacing Confirm/Edit/Regenerate/Other (US-03) and
 *     for calling this again on Regenerate — this router does not persist
 *     interpretations or track confirmation state; that lands with US-03's
 *     decision-persistence work (TT-US03-01), which needs a real
 *     project/interpretation store instead of the in-memory US-01 skeleton.
 */

import { InterpretationRecordSchema } from "@specloop/schemas";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { generateInterpretation } from "../interpretation/index.js";
import { protectedProcedure, router } from "../trpc/trpc.js";
import { getProjectById } from "./projects.js";

export const interpretationRouter = router({
  generate: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
      }),
    )
    .output(InterpretationRecordSchema)
    .mutation(async ({ input }) => {
      const project = getProjectById(input.projectId);
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Project ${input.projectId} not found.`,
        });
      }

      try {
        return await generateInterpretation({
          projectId: project.id,
          rawIdea: project.rawIdea,
          domain: project.domain ?? undefined,
          resourceConstraints: project.resourceConstraints,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Idea interpretation failed. You can try Regenerate.",
          cause: error,
        });
      }
    }),
});
