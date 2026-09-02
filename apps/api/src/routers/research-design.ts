/**
 * Research design router — UC-06 (Design research).
 *
 * Implements FR-11/FR-12/FR-14 and the gap/contribution/claim/experiment
 * generation flow from AI design §8:
 *
 * - AIT-06 Gap proposal: corpus-bounded gap candidates with a mandatory
 *   novelty-risk warning (BR-04: "không đồng nghĩa novelty toàn cầu").
 * - AIT-07 Contribution & atomic claim generation: separates contribution
 *   from falsifiable claim and fills scope/baseline/metric fields.
 * - AIT-08 Experiment planning: links claims to tests, includes B0/B1,
 *   controls and at least one important ablation; feasibility estimates
 *   label every input as assumed or measured.
 *
 * All AI output is *proposed* data until the user selects/edits/confirms
 * (AI design §17 human confirmation points). The application manages
 * authority transitions; the model never self-assigns `USER_CONFIRMED` or
 * `SYSTEM_VERIFIED`.
 *
 * Persistence is in-memory for P0 (see `src/store/project-store.ts`).
 */

import {
  ExperimentPlanSchema,
  GapProposalOutputSchema,
  GenerateClaimDesignInputSchema,
  GenerateClaimDesignWithEvidenceOutputSchema,
  GenerateExperimentPlanInputSchema,
  GenerateGapProposalInputSchema,
  ListAtomicClaimsInputSchema,
  ListAtomicClaimsOutputSchema,
  ListExperimentPlansInputSchema,
  ListExperimentPlansOutputSchema,
} from "@specloop/schemas";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { atomicClaims, experimentPlans, gapProposals } from "../db/schema.js";
import {
  generateClaimDesign,
  generateExperimentPlan,
  generateGapProposal,
} from "../modules/research-design/service.js";
import { publicProcedure, router } from "../trpc/trpc.js";

// ---------------------------------------------------------------------------
// Procedures
// ---------------------------------------------------------------------------

export const researchDesignRouter = router({
  /**
   * AIT-06 — Propose corpus-bounded gap candidates. The LLM receives only
   * the selected corpus (titles + abstracts) as untrusted content and may
   * only reference the provided source IDs (AI design §4 layer 3, §8, §16).
   * The output always carries a novelty-risk warning (BR-04). The result is
   * PROPOSED data; the user Selects/Edits/Combines/Other before claim design.
   */
  generateGapProposal: publicProcedure
    .input(GenerateGapProposalInputSchema)
    .output(GapProposalOutputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const proposal = await generateGapProposal({
          projectId: input.projectId,
          researchQuestionNodeIds: input.researchQuestionNodeIds,
          client: ctx.llm,
          model: ctx.llmConfig.defaultModel,
        });
        return proposal;
      } catch (err) {
        const message = (err as Error).message;
        if (message.includes("Select at least one source")) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Select at least one source into the corpus before proposing a gap " +
              "(AI design §6: gap generation only receives selected corpus evidence).",
          });
        }
        if (message.includes("not found in the decomposition")) {
          throw new TRPCError({ code: "BAD_REQUEST", message });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Gap proposal failed: ${message}`,
        });
      }
    }),

  /**
   * AIT-07 — Generate contributions and atomic claims from a selected gap.
   * The user picks a gap candidate by index from the most recent proposal.
   * The LLM proposes contributions + falsifiable claims; the application
   * validates the output against the schema and the source-ID allowlist,
   * then persists the claims/contributions as PROPOSED data. Evidence
   * requirements (what the metric value must satisfy for the claim to be
   * verified) are auto-generated deterministically for each new claim so
   * the user does not have to run a second process manually. The LLM-backed
   * `evidence.generateEvidenceForClaim` remains for per-claim regeneration.
   */
  generateClaimDesign: publicProcedure
    .input(GenerateClaimDesignInputSchema)
    .output(GenerateClaimDesignWithEvidenceOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const gapRow = db
        .select()
        .from(gapProposals)
        .where(eq(gapProposals.projectId, input.projectId))
        .orderBy(desc(gapProposals.createdAt))
        .limit(1)
        .get();
      const proposal: import("@specloop/schemas").GapProposalOutput | null =
        gapRow ? JSON.parse(gapRow.data as string) : null;
      if (!proposal) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Generate a gap proposal before claim design " +
            "(researchDesign.generateGapProposal).",
        });
      }
      const candidate = proposal.candidates[input.selectedGapIndex];
      if (!candidate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            `selectedGapIndex ${input.selectedGapIndex} out of range ` +
            `(have ${proposal.candidates.length} candidate(s)).`,
        });
      }

      try {
        const result = await generateClaimDesign({
          projectId: input.projectId,
          selectedGapIndex: input.selectedGapIndex,
          client: ctx.llm,
          model: ctx.llmConfig.defaultModel,
        });
        // Map to schema shape expected by the router output — now merged with
        // evidenceRequirements so the frontend does not need a second manual step.
        return {
          contributions: result.persistedContributions.map((c) => ({
            text: c.text,
            claimIds: c.claimIds,
          })),
          claims: result.persistedClaims.map((c) => ({
            type: c.type,
            text: c.text,
            scope: c.scope,
            baseline: c.baseline,
            datasetDomain: c.datasetDomain,
            metric: c.metric,
            expectedDirection: c.expectedDirection,
            falsificationCondition: c.falsificationCondition,
            evidenceRefs: c.evidenceRefs,
            experimentRefs: c.experimentRefs,
          })),
          evidenceRequirements: result.persistedEvidenceRequirements,
        };
      } catch (err) {
        const message = (err as Error).message;
        if (message.includes("Generate a gap proposal")) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Generate a gap proposal before claim design " +
              "(researchDesign.generateGapProposal).",
          });
        }
        if (message.includes("out of range")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Claim design failed: ${message}`,
        });
      }
    }),

  /**
   * AIT-08 — Generate an experiment plan for a set of claims. The LLM
   * proposes baselines, metrics, protocol, controls, ≥1 ablation and
   * estimates with assumed/measured input labels (AI design §8). The
   * application validates the output, assigns ids, and persists the plan
   * as PROPOSED data. The user reviews feasibility before it feeds spec
   * generation (AI design §17).
   */
  generateExperimentPlan: publicProcedure
    .input(GenerateExperimentPlanInputSchema)
    .output(ExperimentPlanSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const plan = await generateExperimentPlan({
          projectId: input.projectId,
          claimIds: input.claimIds,
          tier: input.tier,
          client: ctx.llm,
          model: ctx.llmConfig.defaultModel,
        });
        return plan;
      } catch (err) {
        const message = (err as Error).message;
        if (message.includes("Generate or select at least one atomic claim")) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Generate or select at least one atomic claim before experiment " +
              "planning (researchDesign.generateClaimDesign).",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Experiment plan failed: ${message}`,
        });
      }
    }),

  /**
   * List atomic claims for a project.
   */
  listClaims: publicProcedure
    .input(ListAtomicClaimsInputSchema)
    .output(ListAtomicClaimsOutputSchema)
    .query(({ input }) => {
      const db = getDb();
      const rows = db
        .select()
        .from(atomicClaims)
        .where(eq(atomicClaims.projectId, input.projectId))
        .all();
      const items = rows.map(
        (r) =>
          JSON.parse(
            r.data as string
          ) as import("@specloop/schemas").AtomicClaim
      );
      return { items };
    }),

  /**
   * List experiment plans for a project.
   */
  listPlans: publicProcedure
    .input(ListExperimentPlansInputSchema)
    .output(ListExperimentPlansOutputSchema)
    .query(({ input }) => {
      const db = getDb();
      const rows = db
        .select()
        .from(experimentPlans)
        .where(eq(experimentPlans.projectId, input.projectId))
        .all();
      const items = rows.map(
        (r) =>
          JSON.parse(
            r.data as string
          ) as import("@specloop/schemas").ExperimentPlan
      );
      return { items };
    }),

  /**
   * Read the most recent gap proposal for a project (proposed data; the
   * user selects a candidate before claim design).
   */
  gapProposal: publicProcedure
    .input(ListAtomicClaimsInputSchema)
    .output(GapProposalOutputSchema.nullable())
    .query(({ input }) => {
      const db = getDb();
      const row = db
        .select()
        .from(gapProposals)
        .where(eq(gapProposals.projectId, input.projectId))
        .orderBy(desc(gapProposals.createdAt))
        .limit(1)
        .get();
      if (!row) return null;
      return JSON.parse(
        row.data as string
      ) as import("@specloop/schemas").GapProposalOutput;
    }),
});
