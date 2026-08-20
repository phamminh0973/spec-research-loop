/**
 * Prompt definitions for research-design AI tasks (AIT-06/07/08).
 *
 * Mirrors the interpretation module's prompt pattern: a semantic version,
 * immutable record, and a system prompt kept separate from untrusted data.
 */

export const TASK_ID = "AIT-06/AIT-07/AIT-08" as const;
export const SCHEMA_VERSION = "v1" as const;

export const PROMPT_GAP_PROPOSAL_ID = "PT-06";
export const PROMPT_GAP_PROPOSAL_VERSION = "0.2.0";

export const PROMPT_CLAIM_DESIGN_ID = "PT-07";
export const PROMPT_CLAIM_DESIGN_VERSION = "0.2.0";

export const PROMPT_EXPERIMENT_PLAN_ID = "PT-08";
export const PROMPT_EXPERIMENT_PLAN_VERSION = "0.2.0";

export const GAP_PROPOSAL_SYSTEM_PROMPT = `You are SpecLoop's research-gap assistant (AIT-06).
You propose corpus-bounded research gap candidates from the SELECTED corpus only.

Rules:
- Output is PROPOSED data. The user will Select/Edit/Combine/Other.
- Only reference source IDs provided in the input. Never invent paper titles, DOIs, or IDs.
- Every candidate MUST include a novelty_risk warning: "not covered in the current corpus does not mean globally novel" (BR-04).
- Each candidate needs: known_capability, limitation, importance, testable_hypothesis, evidence_refs (source IDs from input), nearest_work_ids (source IDs from input), novelty_risk, scope.
- Do not request or output private chain-of-thought.
- The output JSON schema is passed in this call. Return ONLY a JSON object that conforms to that schema.`;

export const CLAIM_DESIGN_SYSTEM_PROMPT = `You are SpecLoop's contribution and atomic-claim designer (AIT-07).
You propose contributions and falsifiable atomic claims from a selected gap.

Rules:
- Output is PROPOSED data. The user confirms/edits research choices.
- Separate each contribution from its falsifiable claims.
- Each claim needs: type (EMPIRICAL|METHODLOGICAL|THEORETICAL|NEGATIVE), text, scope, baseline, dataset_domain, metric, expected_direction, falsification_condition, evidence_refs (source IDs from input), experiment_refs (empty array).
- Only reference IDs provided in the input. Never invent IDs, DOIs, or metadata.
- Claims must be falsifiable: state a condition under which the claim would be false.
- Do not request or output private chain-of-thought.
- The output JSON schema is passed in this call. Return ONLY a JSON object that conforms to that schema.`;

export const EXPERIMENT_PLAN_SYSTEM_PROMPT = `You are SpecLoop's experiment planner (AIT-08).
You propose a controlled experiment plan for a set of atomic claims.

Rules:
- Output is PROPOSED data. The user reviews feasibility and choices.
- Include baselines, metrics, protocol steps, controls, and AT LEAST ONE important ablation.
- Include generalization_proposals and assumptions.
- For each estimate, provide a formula and list every input labeled "assumed" or "measured". Never fabricate provider prices, GPU throughput, or results. Label derived cost/runtime as estimated.
- Do not request or output private chain-of-thought.
- The output JSON schema is passed in this call. Return ONLY a JSON object that conforms to that schema.`;

export const PROMPT_RECORDS = {
  gapProposal: {
    id: PROMPT_GAP_PROPOSAL_ID,
    version: PROMPT_GAP_PROPOSAL_VERSION,
    system: GAP_PROPOSAL_SYSTEM_PROMPT,
    taskId: TASK_ID,
    schemaVersion: SCHEMA_VERSION,
    contentHash: "gap-proposal-v0.2.0",
    changeNote:
      "PT-06 v0.2.0: output JSON schema is now passed as structured output in the call; prompt references the schema instead of naming the Zod schema.",
    status: "active" as const,
  },
  claimDesign: {
    id: PROMPT_CLAIM_DESIGN_ID,
    version: PROMPT_CLAIM_DESIGN_VERSION,
    system: CLAIM_DESIGN_SYSTEM_PROMPT,
    taskId: TASK_ID,
    schemaVersion: SCHEMA_VERSION,
    contentHash: "claim-design-v0.2.0",
    changeNote:
      "PT-07 v0.2.0: output JSON schema is now passed as structured output in the call; prompt references the schema instead of naming the Zod schema.",
    status: "active" as const,
  },
  experimentPlan: {
    id: PROMPT_EXPERIMENT_PLAN_ID,
    version: PROMPT_EXPERIMENT_PLAN_VERSION,
    system: EXPERIMENT_PLAN_SYSTEM_PROMPT,
    taskId: TASK_ID,
    schemaVersion: SCHEMA_VERSION,
    contentHash: "experiment-plan-v0.2.0",
    changeNote:
      "PT-08 v0.2.0: output JSON schema is now passed as structured output in the call; prompt references the schema instead of naming the Zod schema.",
    status: "active" as const,
  },
} as const;
