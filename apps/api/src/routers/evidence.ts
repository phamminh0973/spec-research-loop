/**
 * Evidence router — new meaning: verifiable metric thresholds for claims.
 *
 * Implements the merged Generate contributions & claims + evidence step:
 * each atomic claim auto-gets an `EvidenceRequirement` (metric, operator,
 * threshold, success/falsification criteria) that states what the measured
 * metric value must satisfy for the claim to be considered verified.
 * The requirement is PROPOSED data until human-verified (BR-03) and is
 * auto-generated deterministically when claims are created; the LLM-backed
 * `generateEvidenceForClaim` remains for per-claim regeneration.
 *
 * Document spans (`EvidenceSpan`) are retained for source provenance.
 *
 * Persistence is in-memory for P0 (see `src/store/project-store.ts`).
 */

import {
  CreateEvidenceSpanInputSchema,
  EvidenceRequirementSchema,
  EvidenceSpanSchema,
  GenerateEvidenceRequirementInputSchema,
  ListEvidenceRequirementsInputSchema,
  ListEvidenceRequirementsOutputSchema,
  ListEvidenceSpansInputSchema,
  ListEvidenceSpansOutputSchema,
} from "@specloop/schemas";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { evidenceRequirements } from "../db/schema.js";
import {
  createSpan,
  generateEvidenceRequirement,
  listEvidenceRequirements,
  listSpans,
} from "../modules/evidence/service.js";
import { publicProcedure, router } from "../trpc/trpc.js";

// ---------------------------------------------------------------------------
// Procedures
// ---------------------------------------------------------------------------

export const evidenceRouter = router({
  createSpan: publicProcedure
    .input(CreateEvidenceSpanInputSchema)
    .output(EvidenceSpanSchema)
    .mutation(({ input }) => {
      try {
        return createSpan(input);
      } catch (e) {
        const msg = (e as Error).message;
        if (msg.includes("not found")) {
          throw new TRPCError({ code: "NOT_FOUND", message: msg });
        }
        if (msg.includes("EXACT") || msg.includes("endOffset")) {
          throw new TRPCError({ code: "BAD_REQUEST", message: msg });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  listSpans: publicProcedure
    .input(ListEvidenceSpansInputSchema)
    .output(ListEvidenceSpansOutputSchema)
    .query(({ input }) => listSpans(input)),

  /**
   * Generate (or LLM-regenerate) the evidence requirement for a claim —
   * what the metric value must satisfy for the claim to be considered
   * verified. Deterministic requirements are auto-created when claims are
   * generated (research-design generates them); this endpoint allows
   * per-claim LLM regeneration. Output is PROPOSED (BR-03).
   */
  generateEvidenceForClaim: publicProcedure
    .input(GenerateEvidenceRequirementInputSchema)
    .output(EvidenceRequirementSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await generateEvidenceRequirement({
          projectId: input.projectId,
          claimId: input.claimId,
          client: ctx.llm,
          model: ctx.llmConfig.defaultModel,
        });
      } catch (e) {
        const msg = (e as Error).message;
        if (msg.includes("not found")) {
          throw new TRPCError({ code: "NOT_FOUND", message: msg });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  listEvidenceRequirements: publicProcedure
    .input(ListEvidenceRequirementsInputSchema)
    .output(ListEvidenceRequirementsOutputSchema)
    .query(({ input }) => listEvidenceRequirements(input)),

  getEvidenceRequirement: publicProcedure
    .input(z.object({ requirementId: z.string().uuid() }))
    .output(EvidenceRequirementSchema)
    .query(({ input }) => {
      const rows = getDb().select().from(evidenceRequirements).all();
      for (const row of rows) {
        const parsed = JSON.parse(row.data as string) as { id: string };
        if (parsed.id === input.requirementId) {
          return JSON.parse(
            row.data as string
          ) as import("@specloop/schemas").EvidenceRequirement;
        }
      }
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Evidence requirement ${input.requirementId} not found.`,
      });
    }),
});
