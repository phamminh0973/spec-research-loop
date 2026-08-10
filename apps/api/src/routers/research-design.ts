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
  AtomicClaimSchema,
  ClaimDesignOutputSchema,
  ClaimTypeSchema,
  ExperimentPlanOutputSchema,
  ExperimentPlanSchema,
  GapProposalOutputSchema,
  GenerateClaimDesignInputSchema,
  GenerateExperimentPlanInputSchema,
  GenerateGapProposalInputSchema,
  ListAtomicClaimsInputSchema,
  ListAtomicClaimsOutputSchema,
  ListExperimentPlansInputSchema,
  ListExperimentPlansOutputSchema,
  type AtomicClaim,
  type ClaimDesignOutput,
  type Contribution,
  type ExperimentPlan,
  type ExperimentPlanOutput,
  type GapProposalOutput,
} from "@specloop/schemas";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  claimDesignPrompt,
  experimentPlanPrompt,
  gapProposalPrompt,
} from "../llm/prompts.js";
import { structuredCall } from "../llm/structured-call.js";
import { publicProcedure, router } from "../trpc/trpc.js";
import {
  atomicClaimsByProject,
  contributionsByProject,
  experimentPlansByProject,
  gapProposalsByProject,
  getOrCreate,
  parseOrThrow,
  sourcesByProject,
} from "../store/project-store.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the corpus-bounded context for a gap proposal: the selected source
 * documents' titles + abstracts. The gap generator only receives selected
 * corpus evidence (AI design §8); it never sees the whole arXiv result set.
 */
function selectedCorpusContext(projectId: string): {
  titles: string[];
  abstracts: string[];
  sourceIds: string[];
} {
  const list = sourcesByProject.get(projectId) ?? [];
  const selected = list.filter((s) => s.selected);
  return {
    titles: selected.map((s) => s.title),
    abstracts: selected.map((s) => s.abstract),
    sourceIds: selected.map((s) => s.id),
  };
}

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
      const corpus = selectedCorpusContext(input.projectId);
      if (corpus.sourceIds.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Select at least one source into the corpus before proposing a gap " +
            "(AI design §6: gap generation only receives selected corpus evidence).",
        });
      }

      // Render the selected corpus as labeled, untrusted content blocks so
      // the model treats paper text as data, not instructions (§16.2).
      const corpusText = corpus.titles
        .map((t, i) => `Source ${corpus.sourceIds[i]}: ${t}\n${corpus.abstracts[i]}`)
        .join("\n\n");

      const allowedIds = new Set(corpus.sourceIds);
      const proposal = await structuredCall<GapProposalOutput>({
        client: ctx.llm,
        model: ctx.llmConfig.defaultModel,
        systemPrompt: gapProposalPrompt.system,
        userPrompt:
          "Propose 1–3 corpus-bounded research gap candidates from the " +
          "selected corpus below. Only reference the source IDs provided. " +
          "Every candidate must include a novelty_risk warning.",
        untrusted: [{ label: "Selected corpus", text: corpusText }],
        outputSchema: GapProposalOutputSchema,
        allowedIds,
        extractReferencedIds: (out) => [
          ...out.candidates.flatMap((c) => c.evidenceRefs),
          ...out.candidates.flatMap((c) => c.nearestWorkIds),
        ],
      });

      gapProposalsByProject.set(input.projectId, proposal);
      return proposal;
    }),

  /**
   * AIT-07 — Generate contributions and atomic claims from a selected gap.
   * The user picks a gap candidate by index from the most recent proposal.
   * The LLM proposes contributions + falsifiable claims; the application
   * validates the output against the schema and the source-ID allowlist,
   * then persists the claims/contributions as PROPOSED data. The user
   * confirms/edits before they feed experiment planning (AI design §17).
   */
  generateClaimDesign: publicProcedure
    .input(GenerateClaimDesignInputSchema)
    .output(ClaimDesignOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const proposal = gapProposalsByProject.get(input.projectId);
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
          message: `selectedGapIndex ${input.selectedGapIndex} out of range ` +
            `(have ${proposal.candidates.length} candidate(s)).`,
        });
      }

      // The gap candidate is the only untrusted content; the model may only
      // reference the source IDs it carries.
      const allowedIds = new Set(candidate.evidenceRefs);
      const gapText =
        `Known capability: ${candidate.knownCapability}\n` +
        `Limitation: ${candidate.limitation}\n` +
        `Importance: ${candidate.importance}\n` +
        `Testable hypothesis: ${candidate.testableHypothesis}\n` +
        `Scope: ${candidate.scope}\n` +
        `Evidence source IDs: ${candidate.evidenceRefs.join(", ")}`;

      const design = await structuredCall<ClaimDesignOutput>({
        client: ctx.llm,
        model: ctx.llmConfig.defaultModel,
        systemPrompt: claimDesignPrompt.system,
        userPrompt:
          "Propose contributions and falsifiable atomic claims for the " +
          "selected gap below. Only reference the source IDs provided.",
        untrusted: [{ label: "Selected gap candidate", text: gapText }],
        outputSchema: ClaimDesignOutputSchema,
        allowedIds,
        extractReferencedIds: (out) =>
          out.claims.flatMap((c) => c.evidenceRefs),
      });

      // Persist the proposed claims and contributions. The LLM returns claim
      // shapes without ids; the application assigns ids so it remains the
      // single authority over identity (AI design §4).
      const now = new Date().toISOString();
      const claimIdMap = new Map<string, string>();
      const persistedClaims: AtomicClaim[] = design.claims.map((c) => {
        const id = crypto.randomUUID();
        // Map the LLM's evidence refs through unchanged; they were already
        // validated against the allowlist.
        return parseOrThrow(
          AtomicClaimSchema,
          {
            id,
            projectId: input.projectId,
            type: ClaimTypeSchema.parse(c.type),
            text: c.text,
            scope: c.scope,
            baseline: c.baseline,
            datasetDomain: c.datasetDomain,
            metric: c.metric,
            expectedDirection: c.expectedDirection,
            falsificationCondition: c.falsificationCondition,
            evidenceRefs: c.evidenceRefs,
            experimentRefs: c.experimentRefs,
            createdAt: now,
            updatedAt: now,
          },
          "AtomicClaim",
        );
      });
      // The LLM's contribution.claimIds are indices/labels; we cannot trust
      // them as real ids. Rebuild contributions to reference the persisted
      // claim ids in order.
      persistedClaims.forEach((c, i) => claimIdMap.set(String(i), c.id));
      getOrCreate(atomicClaimsByProject, input.projectId).push(...persistedClaims);

      const persistedContributions: Contribution[] = design.contributions.map(
        (c) => {
          const id = crypto.randomUUID();
          // Assign the first N persisted claim ids to each contribution in
          // order; the LLM's claimIds are not trusted as real ids.
          const claimIds = persistedClaims.slice(0, c.claimIds.length).map(
            (cl) => cl.id,
          );
          return parseOrThrow(
            z.object({
              id: z.string().uuid(),
              projectId: z.string().uuid(),
              text: z.string().min(1).max(2_000),
              claimIds: z.array(z.string().uuid()).default([]),
              createdAt: z.string(),
            }),
            {
              id,
              projectId: input.projectId,
              text: c.text,
              claimIds,
              createdAt: now,
            },
            "Contribution",
          );
        },
      );
      getOrCreate(contributionsByProject, input.projectId).push(
        ...persistedContributions,
      );

      // Return the design with the persisted claim ids substituted in.
      return parseOrThrow(
        ClaimDesignOutputSchema,
        {
          contributions: persistedContributions.map((c) => ({
            text: c.text,
            claimIds: c.claimIds,
          })),
          claims: persistedClaims.map((c) => ({
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
        },
        "ClaimDesignOutput",
      );
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
      const claims = atomicClaimsByProject.get(input.projectId) ?? [];
      const selectedClaims = input.claimIds.length
        ? claims.filter((c) => input.claimIds.includes(c.id))
        : claims;
      if (selectedClaims.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Generate or select at least one atomic claim before experiment " +
            "planning (researchDesign.generateClaimDesign).",
        });
      }

      // Render the claims as untrusted content; the model treats them as data.
      const claimsText = selectedClaims
        .map(
          (c) =>
            `Claim ${c.id} [${c.type}]: ${c.text}\n` +
            `  scope: ${c.scope}\n  baseline: ${c.baseline}\n` +
            `  metric: ${c.metric}\n  falsifies if: ${c.falsificationCondition}`,
        )
        .join("\n\n");

      const planOutput = await structuredCall<ExperimentPlanOutput>({
        client: ctx.llm,
        model: ctx.llmConfig.defaultModel,
        systemPrompt: experimentPlanPrompt.system,
        userPrompt:
          "Propose a controlled experiment plan for the claims below. " +
          "Include at least one important ablation. Label every estimate " +
          "input as assumed or measured; never fabricate prices or throughput.",
        untrusted: [{ label: "Atomic claims", text: claimsText }],
        outputSchema: ExperimentPlanOutputSchema,
      });

      const now = new Date().toISOString();
      const plan: ExperimentPlan = parseOrThrow(
        ExperimentPlanSchema,
        {
          id: crypto.randomUUID(),
          projectId: input.projectId,
          tier: input.tier,
          baselines: planOutput.baselines,
          metrics: planOutput.metrics,
          protocol: planOutput.protocol,
          controls: planOutput.controls,
          ablations: planOutput.ablations,
          generalizationProposals: planOutput.generalizationProposals,
          assumptions: planOutput.assumptions,
          estimates: planOutput.estimates,
          claimIds: selectedClaims.map((c) => c.id),
          createdAt: now,
          updatedAt: now,
        },
        "ExperimentPlan",
      );
      getOrCreate(experimentPlansByProject, input.projectId).push(plan);
      return plan;
    }),

  /**
   * List atomic claims for a project.
   */
  listClaims: publicProcedure
    .input(ListAtomicClaimsInputSchema)
    .output(ListAtomicClaimsOutputSchema)
    .query(({ input }) => {
      const items = atomicClaimsByProject.get(input.projectId) ?? [];
      return { items };
    }),

  /**
   * List experiment plans for a project.
   */
  listPlans: publicProcedure
    .input(ListExperimentPlansInputSchema)
    .output(ListExperimentPlansOutputSchema)
    .query(({ input }) => {
      const items = experimentPlansByProject.get(input.projectId) ?? [];
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
      return gapProposalsByProject.get(input.projectId) ?? null;
    }),
});
