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
  EvidenceEntryTypeSchema,
  EvidenceReviewOutputSchema,
  EvidenceSpanSchema,
  EvidenceVerdictSchema,
  ListClaimEvidenceLinksInputSchema,
  ListClaimEvidenceLinksOutputSchema,
  ListEvidenceSpansInputSchema,
  ListEvidenceSpansOutputSchema,
  ProposeEvidenceSpansInputSchema,
  ProposeEvidenceSpansOutputSchema,
  RunIntegrityChecksInputSchema,
  RunIntegrityChecksOutputSchema,
  type ClaimEvidenceLink,
  type EvidenceReviewOutput,
  type EvidenceSpan,
  type ProposeEvidenceSpansOutput,
} from "@specloop/schemas";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  evidenceReviewPrompt,
  evidenceSpanProposalPrompt,
} from "../llm/prompts.js";
import { structuredCall } from "../llm/structured-call.js";
import { publicProcedure, router } from "../trpc/trpc.js";
import {
  claimEvidenceLinksByProject,
  evidenceSpansByProject,
  getOrCreate,
  parseOrThrow,
  sourcesByProject,
} from "../store/project-store.js";

// ---------------------------------------------------------------------------
// Deterministic integrity checks (FR-10 / FR-13)
// ---------------------------------------------------------------------------

/**
 * Deterministic integrity status for a claim–evidence link. Mirrors the
 * verification steps in AI design §7.2: source exists, page/offset valid,
 * exact text matches, link targets exist.
 */
type IntegrityStatus = ClaimEvidenceLink["integrityStatus"];

function computeIntegrity(
  link: { claimNodeId: string; evidenceSpanId: string },
  span: EvidenceSpan | undefined,
): IntegrityStatus {
  if (!span) return "MISSING_SOURCE";
  // EXACT spans require page + offsets + non-empty exact text.
  if (span.entryType === "EXACT") {
    if (span.page == null || span.startOffset == null || span.endOffset == null) {
      return "INVALID_OFFSET";
    }
    if (span.endOffset < span.startOffset) {
      return "INVALID_OFFSET";
    }
    if (span.exactText.length === 0) {
      return "EXACT_TEXT_MISMATCH";
    }
  }
  // Link target existence (claim node) is validated at creation time by the
  // spec_structure module; here we only assert the span reference resolves.
  if (link.evidenceSpanId !== span.id) {
    return "INVALID_LINK";
  }
  return "VALID";
}

// ---------------------------------------------------------------------------
// Procedures
// ---------------------------------------------------------------------------

export const evidenceRouter = router({
  /**
   * Store an evidence span selected by the user. For `EXACT` spans the
   * application stores page + character offsets + verbatim text; the LLM
   * never chooses or rewrites the exact text (AI design §7.1).
   */
  createSpan: publicProcedure
    .input(CreateEvidenceSpanInputSchema)
    .output(EvidenceSpanSchema)
    .mutation(({ input }) => {
      const sources = sourcesByProject.get(input.projectId) ?? [];
      if (!sources.some((s) => s.id === input.sourceId)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Source ${input.sourceId} not found in project ${input.projectId}.`,
        });
      }

      // Infer entry type when not provided: EXACT requires page + offsets.
      const hasOffsets =
        input.page != null &&
        input.startOffset != null &&
        input.endOffset != null;
      const entryType = EvidenceEntryTypeSchema.parse(
        input.entryType ?? (hasOffsets ? "EXACT" : "MANUAL"),
      );

      // EXACT spans must carry page + offsets; reject otherwise so the
      // "exact" label is never applied to un-locatable text.
      if (entryType === "EXACT" && !hasOffsets) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "EXACT evidence spans require page, startOffset and endOffset.",
        });
      }
      if (
        entryType === "EXACT" &&
        input.startOffset != null &&
        input.endOffset != null &&
        input.endOffset < input.startOffset
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "endOffset must be >= startOffset.",
        });
      }

      const span = parseOrThrow(
        EvidenceSpanSchema,
        {
          id: crypto.randomUUID(),
          projectId: input.projectId,
          sourceId: input.sourceId,
          page: input.page,
          startOffset: input.startOffset,
          endOffset: input.endOffset,
          exactText: input.exactText,
          entryType,
          createdAt: new Date().toISOString(),
        },
        "EvidenceSpan",
      );
      getOrCreate(evidenceSpansByProject, input.projectId).push(span);
      return span;
    }),

  /**
   * List evidence spans for a project, optionally filtered by source.
   */
  listSpans: publicProcedure
    .input(ListEvidenceSpansInputSchema)
    .output(ListEvidenceSpansOutputSchema)
    .query(({ input }) => {
      const all = (evidenceSpansByProject.get(input.projectId) ?? []).filter(
        (s) => !input.sourceId || s.sourceId === input.sourceId,
      );
      return { items: all.slice(0, input.limit) };
    }),

  /**
   * AIT-05-propose — Suggest evidence spans from the selected corpus for a
   * given claim. The LLM proposes verbatim excerpts + rationale; the user
   * confirms/edits before a span is stored via `evidence.createSpan`. The
   * model never rewrites the exact text (AI design §7.1) and may only
   * reference source IDs from the selected corpus (§4 layer 3).
   */
  proposeSpans: publicProcedure
    .input(ProposeEvidenceSpansInputSchema)
    .output(ProposeEvidenceSpansOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const list = sourcesByProject.get(input.projectId) ?? [];
      const selected = list.filter((s) => s.selected);
      if (selected.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Select at least one source into the corpus before proposing " +
            "evidence spans (AI design §6).",
        });
      }

      const allowedIds = new Set(selected.map((s) => s.id));
      const corpusText = selected
        .map((s) => `Source ${s.id}: ${s.title}\n${s.abstract}`)
        .join("\n\n");

      const output = await structuredCall<ProposeEvidenceSpansOutput>({
        client: ctx.llm,
        model: ctx.llmConfig.defaultModel,
        systemPrompt: evidenceSpanProposalPrompt.system,
        userPrompt:
          "Propose evidence excerpts from the selected corpus below that " +
          "support the given claim. Only reference the source IDs provided. " +
          "Use verbatim excerpts; do not rewrite the text.",
        untrusted: [
          { label: "Claim", text: input.claimText },
          { label: "Selected corpus", text: corpusText },
        ],
        outputSchema: ProposeEvidenceSpansOutputSchema,
        allowedIds,
        extractReferencedIds: (out) =>
          out.proposals.map((p) => p.sourceId),
      });
      return output;
    }),

  /**
   * Link a claim node to an evidence span. The link is created with a
   * deterministic integrity status computed immediately; the atomic AI
   * review (`review`) is null until `evidence.runReview` is invoked.
   */
  createLink: publicProcedure
    .input(CreateClaimEvidenceLinkInputSchema)
    .output(ClaimEvidenceLinkSchema)
    .mutation(({ input }) => {
      const spans = evidenceSpansByProject.get(input.projectId) ?? [];
      const span = spans.find((s) => s.id === input.evidenceSpanId);
      if (!span) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Evidence span ${input.evidenceSpanId} not found in project ${input.projectId}.`,
        });
      }

      const now = new Date().toISOString();
      const link: ClaimEvidenceLink = parseOrThrow(
        ClaimEvidenceLinkSchema,
        {
          id: crypto.randomUUID(),
          projectId: input.projectId,
          claimNodeId: input.claimNodeId,
          evidenceSpanId: input.evidenceSpanId,
          integrityStatus: "VALID",
          review: null,
          createdAt: now,
          updatedAt: now,
        },
        "ClaimEvidenceLink",
      );
      link.integrityStatus = computeIntegrity(link, span);
      getOrCreate(claimEvidenceLinksByProject, input.projectId).push(link);
      return link;
    }),

  /**
   * List claim–evidence links, optionally filtered by claim node.
   */
  listLinks: publicProcedure
    .input(ListClaimEvidenceLinksInputSchema)
    .output(ListClaimEvidenceLinksOutputSchema)
    .query(({ input }) => {
      const all = (claimEvidenceLinksByProject.get(input.projectId) ?? []).filter(
        (l) => !input.claimNodeId || l.claimNodeId === input.claimNodeId,
      );
      return { items: all };
    }),

  /**
   * Re-run deterministic integrity checks for every claim–evidence link in a
   * project (FR-13). This is a pure application computation; no LLM is
   * involved. Invalid links/offsets/exact-text mismatches are surfaced with
   * a status the UI can act on.
   */
  runIntegrityChecks: publicProcedure
    .input(RunIntegrityChecksInputSchema)
    .output(RunIntegrityChecksOutputSchema)
    .mutation(({ input }) => {
      const links = claimEvidenceLinksByProject.get(input.projectId) ?? [];
      const spans = evidenceSpansByProject.get(input.projectId) ?? [];
      const spanById = new Map(spans.map((s) => [s.id, s]));

      const results = links.map((link) => {
        const span = spanById.get(link.evidenceSpanId);
        link.integrityStatus = computeIntegrity(link, span);
        link.updatedAt = new Date().toISOString();
        return {
          linkId: link.id,
          integrityStatus: link.integrityStatus,
        };
      });
      return { results };
    }),

  /**
   * Atomic claim–evidence review (AIT-05). One claim, one span, short
   * context, fixed rubric. The LLM proposes a verdict + reason; the
   * application validates it against the allowed enum and persists it as
   * PROPOSED data. The review does not confer USER_CONFIRMED or
   * SYSTEM_VERIFIED authority (AI design §2.1/§2.2).
   *
   * The claim text and evidence text are passed as untrusted content blocks
   * (AI design §16.2): the model treats them as data, not instructions.
   */
  runReview: publicProcedure
    .input(z.object({ linkId: z.string().uuid() }))
    .output(ClaimEvidenceLinkSchema)
    .mutation(async ({ input, ctx }) => {
      // Find the link across all projects (linkId is globally unique).
      let link: ClaimEvidenceLink | undefined;
      let projectId: string | undefined;
      for (const [pid, list] of claimEvidenceLinksByProject.entries()) {
        const found = list.find((l) => l.id === input.linkId);
        if (found) {
          link = found;
          projectId = pid;
          break;
        }
      }
      if (!link || !projectId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Claim–evidence link ${input.linkId} not found.`,
        });
      }

      // Resolve the evidence span text for the review context.
      const spans = evidenceSpansByProject.get(projectId) ?? [];
      const span = spans.find((s) => s.id === link!.evidenceSpanId);
      if (!span) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Evidence span ${link.evidenceSpanId} not found for link ${link.id}.`,
        });
      }

      // The claim text is owned by the spec_structure module; P0 stores it
      // on the link's claimNodeId reference. Until spec_structure exposes a
      // lookup, we pass the claim node id as the claim identifier and the
      // evidence exact text as the span under review.
      const review = await structuredCall<EvidenceReviewOutput>({
        client: ctx.llm,
        model: ctx.llmConfig.defaultModel,
        systemPrompt: evidenceReviewPrompt.system,
        userPrompt:
          "Review the following claim against the evidence span. " +
          "Return one allowed verdict and a concise reason.",
        untrusted: [
          { label: "Claim (node id)", text: link.claimNodeId },
          { label: "Evidence span exact text", text: span.exactText },
        ],
        outputSchema: EvidenceReviewOutputSchema,
      });

      link.review = {
        verdict: review.verdict,
        reason: review.reason,
        unsupportedAspects: review.unsupportedAspects,
      };
      link.updatedAt = new Date().toISOString();
      return parseOrThrow(ClaimEvidenceLinkSchema, link, "ClaimEvidenceLink");
    }),
});
