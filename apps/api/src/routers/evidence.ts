/**
 * Evidence router — UC-05 (Ground claims in evidence).
 *
 * Implements FR-08/FR-09/FR-10/FR-13 and the evidence extraction &
 * verification flow from AI design §7:
 *
 * ```text
 * Extraction:  user selects exact span → app stores page/offsets/exact text
 * Verification: deterministic checks (source exists, page/offset valid,
 *               exact text matches, link targets exist) → atomic AI review
 *               (AIT-05) with fixed rubric → human verification for gold.
 * ```
 *
 * Deterministic integrity is computed by the application, never the model.
 * The atomic AI review (AIT-05) is invoked through the LLM gateway and may
 * only return an allowed verdict + reason; it does not confer
 * `USER_CONFIRMED` or `SYSTEM_VERIFIED` authority (AI design §2.1).
 *
 * Persistence is in-memory for P0 (see `src/store/project-store.ts`).
 */

import {
  ClaimEvidenceLinkSchema,
  CreateClaimEvidenceLinkInputSchema,
  CreateEvidenceSpanInputSchema,
  EvidenceSpanSchema,
  ListClaimEvidenceLinksInputSchema,
  ListClaimEvidenceLinksOutputSchema,
  ListEvidenceSpansInputSchema,
  ListEvidenceSpansOutputSchema,
  ProposeEvidenceSpansInputSchema,
  ProposeEvidenceSpansOutputSchema,
  RunIntegrityChecksInputSchema,
  RunIntegrityChecksOutputSchema,
} from "@specloop/schemas";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../trpc/trpc.js";
import {
  createLink,
  createSpan,
  listLinks,
  listSpans,
  proposeSpans,
  runIntegrityChecks,
  runReview,
} from "../modules/evidence/service.js";

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

  proposeSpans: publicProcedure
    .input(ProposeEvidenceSpansInputSchema)
    .output(ProposeEvidenceSpansOutputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await proposeSpans({
          projectId: input.projectId,
          claimText: input.claimText,
          client: ctx.llm,
          model: ctx.llmConfig.defaultModel,
        });
      } catch (e) {
        const msg = (e as Error).message;
        if (msg.includes("Select at least one source")) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: msg });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  createLink: publicProcedure
    .input(CreateClaimEvidenceLinkInputSchema)
    .output(ClaimEvidenceLinkSchema)
    .mutation(({ input }) => {
      try {
        return createLink(input);
      } catch (e) {
        const msg = (e as Error).message;
        if (msg.includes("not found")) {
          throw new TRPCError({ code: "NOT_FOUND", message: msg });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  listLinks: publicProcedure
    .input(ListClaimEvidenceLinksInputSchema)
    .output(ListClaimEvidenceLinksOutputSchema)
    .query(({ input }) => listLinks(input)),

  runIntegrityChecks: publicProcedure
    .input(RunIntegrityChecksInputSchema)
    .output(RunIntegrityChecksOutputSchema)
    .mutation(({ input }) => runIntegrityChecks(input.projectId)),

  runReview: publicProcedure
    .input(z.object({ linkId: z.string().uuid() }))
    .output(ClaimEvidenceLinkSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await runReview({
          linkId: input.linkId,
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
});
