/**
 * Research-design service (AIT-06/07/08).
 *
 * Pure business logic for gap proposal, claim design and experiment planning.
 * Mirrors the interpretation service pattern: input validation, LLM call via
 * structuredCall, schema validation, deterministic persistence, PROPOSED
 * status only. Routers remain thin.
 */

import {
  AtomicClaimSchema,
  ClaimDesignOutputSchema,
  ClaimTypeSchema,
  ExperimentPlanOutputSchema,
  ExperimentPlanSchema,
  GapProposalOutputSchema,
  type AtomicClaim,
  type ClaimDesignOutput,
  type ExperimentPlan,
  type GapProposalOutput,
  type Contribution,
} from "@specloop/schemas";
import { z } from "zod";
import {
  GAP_PROPOSAL_SYSTEM_PROMPT,
  CLAIM_DESIGN_SYSTEM_PROMPT,
  EXPERIMENT_PLAN_SYSTEM_PROMPT,
} from "./prompt.js";
import { structuredCall } from "../../llm/structured-call.js";
import {
  atomicClaimsByProject,
  contributionsByProject,
  experimentPlansByProject,
  gapProposalsByProject,
  getOrCreate,
  parseOrThrow,
  sourcesByProject,
} from "../../store/project-store.js";

/** Build corpus-bounded context for gap proposal. */
export function selectedCorpusContext(projectId: string): {
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

/** AIT-06: propose corpus-bounded gap candidates. */
export async function generateGapProposal(params: {
  projectId: string;
  client: any;
  model: string;
}): Promise<GapProposalOutput> {
  const { projectId, client, model } = params;
  const corpus = selectedCorpusContext(projectId);
  if (corpus.sourceIds.length === 0) {
    throw new Error("Select at least one source into the corpus before proposing a gap.");
  }

  const corpusText = corpus.titles
    .map((t, i) => `Source ${corpus.sourceIds[i]}: ${t}\n${corpus.abstracts[i]}`)
    .join("\n\n");

  const allowedIds = new Set(corpus.sourceIds);
  const proposal = await structuredCall<GapProposalOutput>({
    client,
    model,
    systemPrompt: GAP_PROPOSAL_SYSTEM_PROMPT,
    userPrompt:
      "Propose 1–3 corpus-bounded research gap candidates from the selected corpus below. Only reference the source IDs provided. Every candidate must include a novelty_risk warning.",
    untrusted: [{ label: "Selected corpus", text: corpusText }],
    outputSchema: GapProposalOutputSchema,
    allowedIds,
    extractReferencedIds: (out) => [
      ...out.candidates.flatMap((c) => c.evidenceRefs),
      ...out.candidates.flatMap((c) => c.nearestWorkIds),
    ],
  });

  gapProposalsByProject.set(projectId, proposal);
  return proposal;
}

/** AIT-07: generate contributions and atomic claims from a selected gap. */
export async function generateClaimDesign(params: {
  projectId: string;
  selectedGapIndex: number;
  client: any;
  model: string;
}): Promise<ClaimDesignOutput & { persistedClaims: AtomicClaim[]; persistedContributions: Contribution[] }> {
  const { projectId, selectedGapIndex, client, model } = params;

  const proposal = gapProposalsByProject.get(projectId);
  if (!proposal) {
    throw new Error("Generate a gap proposal before claim design.");
  }
  const candidate = proposal.candidates[selectedGapIndex];
  if (!candidate) {
    throw new Error(`selectedGapIndex ${selectedGapIndex} out of range.`);
  }

  const allowedIds = new Set(candidate.evidenceRefs);
  const gapText =
    `Known capability: ${candidate.knownCapability}\n` +
    `Limitation: ${candidate.limitation}\n` +
    `Importance: ${candidate.importance}\n` +
    `Testable hypothesis: ${candidate.testableHypothesis}\n` +
    `Scope: ${candidate.scope}\n` +
    `Evidence source IDs: ${candidate.evidenceRefs.join(", ")}`;

  const design = await structuredCall<ClaimDesignOutput>({
    client,
    model,
    systemPrompt: CLAIM_DESIGN_SYSTEM_PROMPT,
    userPrompt:
      "Propose contributions and falsifiable atomic claims for the selected gap below. Only reference the source IDs provided.",
    untrusted: [{ label: "Selected gap candidate", text: gapText }],
    outputSchema: ClaimDesignOutputSchema,
    allowedIds,
    extractReferencedIds: (out) => out.claims.flatMap((c) => c.evidenceRefs),
  });

  const now = new Date().toISOString();
  const persistedClaims: AtomicClaim[] = design.claims.map((c) =>
    parseOrThrow(
      AtomicClaimSchema,
      {
        id: crypto.randomUUID(),
        projectId,
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
    ),
  );
  getOrCreate(atomicClaimsByProject, projectId).push(...persistedClaims);

  const persistedContributions: Contribution[] = design.contributions.map((c) => {
    const id = crypto.randomUUID();
    const claimIds = persistedClaims.slice(0, c.claimIds.length).map((cl) => cl.id);
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
        projectId,
        text: c.text,
        claimIds,
        createdAt: now,
      },
      "Contribution",
    );
  });
  getOrCreate(contributionsByProject, projectId).push(...persistedContributions);

  // Return design with persisted IDs substituted.
  return {
    contributions: persistedContributions.map((c) => ({ text: c.text, claimIds: c.claimIds })),
    claims: design.claims,
    persistedClaims,
    persistedContributions,
  };
}

/** AIT-08: generate experiment plan for claims. */
export async function generateExperimentPlan(params: {
  projectId: string;
  claimIds: string[];
  tier: string;
  client: any;
  model: string;
}): Promise<ExperimentPlan> {
  const { projectId, claimIds, tier, client, model } = params;

  const claims = atomicClaimsByProject.get(projectId) ?? [];
  const selectedClaims = claimIds.length ? claims.filter((c) => claimIds.includes(c.id)) : claims;
  if (selectedClaims.length === 0) {
    throw new Error("Generate or select at least one atomic claim before experiment planning.");
  }

  const claimsText = selectedClaims
    .map(
      (c) =>
        `Claim ${c.id} [${c.type}]: ${c.text}\n` +
        `  scope: ${c.scope}\n  baseline: ${c.baseline}\n` +
        `  metric: ${c.metric}\n  falsifies if: ${c.falsificationCondition}`,
    )
    .join("\n\n");

  const planOutput = await structuredCall({
    client,
    model,
    systemPrompt: EXPERIMENT_PLAN_SYSTEM_PROMPT,
    userPrompt:
      "Propose a controlled experiment plan for the claims below. Include at least one important ablation. Label every estimate input as assumed or measured; never fabricate prices or throughput.",
    untrusted: [{ label: "Atomic claims", text: claimsText }],
    outputSchema: ExperimentPlanOutputSchema,
  });

  const now = new Date().toISOString();
  const plan: ExperimentPlan = parseOrThrow(
    ExperimentPlanSchema,
    {
      id: crypto.randomUUID(),
      projectId,
      tier,
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
  getOrCreate(experimentPlansByProject, projectId).push(plan);
  return plan;
}
