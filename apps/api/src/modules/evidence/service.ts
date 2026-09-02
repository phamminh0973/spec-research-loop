/**
 * Evidence service — new meaning: what the metric value must satisfy for a
 * claim to be considered verified.
 *
 * Each `EvidenceRequirement` captures a verifiable criterion for one
 * {@link AtomicClaim} (or spec `CLAIM` node): metric, operator, threshold,
 * success/falsification criteria and measurement method. Document spans
 * (`EvidenceSpan`) are retained for source provenance; the verifiable
 * criterion lives entirely in `EvidenceRequirement` and is auto-generated
 * deterministically when claims are created (research-design generates it),
 * with an LLM-backed regeneration path available per claim.
 */

import {
  EvidenceEntryTypeSchema,
  EvidenceRequirementSchema,
  EvidenceSpanSchema,
  GenerateEvidenceRequirementOutputSchema,
  type EvidenceRequirement,
  type EvidenceSpan,
  type GenerateEvidenceRequirementOutput,
} from "@specloop/schemas";
import { EVIDENCE_REQUIREMENT_SYSTEM_PROMPT } from "./prompt.js";
import { structuredCall } from "../../llm/structured-call.js";
import {
  atomicClaimsByProject,
  evidenceRequirementsByProject,
  evidenceSpansByProject,
  appendToProjectList,
  parseOrThrow,
  sourcesByProject,
  specGraphsByProject,
} from "../../store/project-store.js";

// ---------------------------------------------------------------------------
// Document spans (source provenance — not claim–evidence links)
// ---------------------------------------------------------------------------

export function createSpan(params: {
  projectId: string;
  sourceId: string;
  page?: number | null;
  startOffset?: number | null;
  endOffset?: number | null;
  exactText?: string;
  entryType?: string;
}): EvidenceSpan {
  const { projectId, sourceId, page, startOffset, endOffset, exactText, entryType } = params;

  const sources = sourcesByProject.get(projectId) ?? [];
  if (!sources.some((s) => s.id === sourceId)) {
    throw new Error(`Source ${sourceId} not found in project ${projectId}.`);
  }

  const hasOffsets = page != null && startOffset != null && endOffset != null;
  const inferredType = entryType ?? (hasOffsets ? "EXACT" : "MANUAL");
  const entry = EvidenceEntryTypeSchema.parse(inferredType);

  if (entry === "EXACT" && !hasOffsets) {
    throw new Error("EXACT evidence spans require page, startOffset and endOffset.");
  }
  if (entry === "EXACT" && startOffset != null && endOffset != null && endOffset < startOffset) {
    throw new Error("endOffset must be >= startOffset.");
  }

  const span = parseOrThrow(
    EvidenceSpanSchema,
    {
      id: crypto.randomUUID(),
      projectId,
      sourceId,
      page,
      startOffset,
      endOffset,
      exactText: exactText ?? "",
      entryType: entry,
      createdAt: new Date().toISOString(),
    },
    "EvidenceSpan",
  );
  appendToProjectList(evidenceSpansByProject, projectId, span);
  return span;
}

export function listSpans(params: {
  projectId: string;
  sourceId?: string;
  limit?: number;
}): { items: EvidenceSpan[] } {
  const { projectId, sourceId, limit = 100 } = params;
  const all = (evidenceSpansByProject.get(projectId) ?? []).filter(
    (s) => !sourceId || s.sourceId === sourceId,
  );
  return { items: all.slice(0, limit) };
}

// ---------------------------------------------------------------------------
// Evidence requirements — the new "evidence" meaning
// ---------------------------------------------------------------------------

export type ClaimContext = {
  id: string;
  projectId: string;
  text: string;
  metric: string;
  expectedDirection: string;
  falsificationCondition: string;
  baseline: string;
  datasetDomain: string;
  scope: string;
  type?: string;
};

export function resolveClaimContext(projectId: string, claimId: string): ClaimContext {
  const claims = atomicClaimsByProject.get(projectId) ?? [];
  const ac = claims.find((c) => c.id === claimId);
  if (ac) {
    return {
      id: ac.id,
      projectId: ac.projectId,
      text: ac.text,
      metric: ac.metric,
      expectedDirection: ac.expectedDirection,
      falsificationCondition: ac.falsificationCondition,
      baseline: ac.baseline,
      datasetDomain: ac.datasetDomain,
      scope: ac.scope,
      type: ac.type,
    };
  }
  const graph = specGraphsByProject.get(projectId);
  const node = graph?.nodes.find((n) => n.id === claimId);
  if (node) {
    return {
      id: node.id,
      projectId: node.projectId,
      text: node.content,
      metric: "as described in claim",
      expectedDirection: "as described in claim",
      falsificationCondition: "negation of claim content",
      baseline: "baseline stated in claim if any",
      datasetDomain: "dataset/domain stated in claim if any",
      scope: node.title,
      type: node.type,
    };
  }
  throw new Error(`Claim ${claimId} not found in project ${projectId}.`);
}

export function listEvidenceRequirements(params: {
  projectId: string;
  claimId?: string;
}): { items: EvidenceRequirement[] } {
  const { projectId, claimId } = params;
  const all = (evidenceRequirementsByProject.get(projectId) ?? []).filter(
    (r) => !claimId || r.claimId === claimId,
  );
  return { items: all };
}

function inferOperator(expectedDirection: string): EvidenceRequirement["operator"] {
  const lower = expectedDirection.toLowerCase();
  if (lower.includes("statistically") || lower.includes("p <") || lower.includes("p<") || lower.includes("significant")) {
    return "STATISTICALLY_SIGNIFICANT";
  }
  if (lower.includes("range") || lower.includes("between") || lower.includes("interval")) {
    return "IN_RANGE";
  }
  if (lower.includes("greater than") && !lower.includes("or equal")) return "GT";
  if (lower.includes("less than") && !lower.includes("or equal")) return "LT";
  if (lower.includes("increase") || lower.includes("improv") || lower.includes("higher") || lower.includes("greater") || lower.includes("exceed") || lower.includes(">=") || lower.includes("at least")) {
    return "GTE";
  }
  if (lower.includes("decrease") || lower.includes("reduce") || lower.includes("lower") || lower.includes("less") || lower.includes("<=")) {
    return "LTE";
  }
  if (lower.includes("equal") || lower.includes("no difference") || lower.includes("==")) return "EQ";
  return "GTE";
}

export function buildDeterministicEvidenceRequirement(
  projectId: string,
  ctx: ClaimContext,
): EvidenceRequirement {
  const operator = inferOperator(ctx.expectedDirection);
  const threshold = `Not (${ctx.falsificationCondition}) — satisfies ${ctx.expectedDirection} on ${ctx.metric}`;
  const successCriterion = `Claim "${ctx.text}" is verified if ${ctx.metric} measured on ${ctx.datasetDomain} in scope "${ctx.scope}" vs baseline ${ctx.baseline} shows ${ctx.expectedDirection} and does not satisfy falsification condition: ${ctx.falsificationCondition}.`;
  const measurementMethod = `Measure ${ctx.metric} on ${ctx.datasetDomain} against baseline ${ctx.baseline} within scope ${ctx.scope}.`;
  const now = new Date().toISOString();
  return parseOrThrow(
    EvidenceRequirementSchema,
    {
      id: crypto.randomUUID(),
      projectId,
      claimId: ctx.id,
      metric: ctx.metric,
      operator,
      threshold: threshold.slice(0, 500),
      successCriterion: successCriterion.slice(0, 2000),
      falsificationCriterion: ctx.falsificationCondition,
      measurementMethod: measurementMethod.slice(0, 2000),
      requiredObservations: [ctx.metric],
      createdAt: now,
      updatedAt: now,
    },
    "EvidenceRequirement",
  );
}

export function ensureEvidenceRequirementsForClaims(params: {
  projectId: string;
  claimIds?: string[];
}): EvidenceRequirement[] {
  const { projectId, claimIds } = params;
  const ids = claimIds ?? (atomicClaimsByProject.get(projectId) ?? []).map((c) => c.id);
  const existingByClaim = new Map(
    (evidenceRequirementsByProject.get(projectId) ?? []).map((r) => [r.claimId, r]),
  );
  const created: EvidenceRequirement[] = [];
  for (const claimId of ids) {
    if (existingByClaim.has(claimId)) {
      created.push(existingByClaim.get(claimId)!);
      continue;
    }
    try {
      const ctx = resolveClaimContext(projectId, claimId);
      const req = buildDeterministicEvidenceRequirement(projectId, ctx);
      appendToProjectList(evidenceRequirementsByProject, projectId, req);
      created.push(req);
    } catch {
      // skip claims that cannot be resolved (e.g. deleted)
    }
  }
  return created;
}

export async function generateEvidenceRequirementsForClaims(params: {
  projectId: string;
  claimIds?: string[];
  client: any;
  model: string;
}): Promise<EvidenceRequirement[]> {
  const { projectId, claimIds, client, model } = params;
  const ids = claimIds ?? (atomicClaimsByProject.get(projectId) ?? []).map((c) => c.id);
  const results: EvidenceRequirement[] = [];
  for (const claimId of ids) {
    const existing = (evidenceRequirementsByProject.get(projectId) ?? []).find((r) => r.claimId === claimId);
    if (existing) {
      results.push(existing);
      continue;
    }
    const req = await generateEvidenceRequirement({ projectId, claimId, client, model });
    results.push(req);
  }
  return results;
}

export async function generateEvidenceRequirement(params: {
  projectId: string;
  claimId: string;
  client: any;
  model: string;
}): Promise<EvidenceRequirement> {
  const { projectId, claimId, client, model } = params;
  const ctx = resolveClaimContext(projectId, claimId);

  const claimText =
    `Claim ${ctx.id} [${ctx.type ?? "CLAIM"}]: ${ctx.text}\n` +
    `metric: ${ctx.metric}\n` +
    `expectedDirection: ${ctx.expectedDirection}\n` +
    `falsificationCondition: ${ctx.falsificationCondition}\n` +
    `baseline: ${ctx.baseline}\n` +
    `datasetDomain: ${ctx.datasetDomain}\n` +
    `scope: ${ctx.scope}`;

  const out = await structuredCall<GenerateEvidenceRequirementOutput>({
    client,
    model,
    systemPrompt: EVIDENCE_REQUIREMENT_SYSTEM_PROMPT,
    userPrompt:
      "Derive the verifiable evidence criterion for the claim below: what measured metric value must the evidence satisfy for the claim to be considered verified. Return threshold/operator/success and falsification criteria.",
    untrusted: [{ label: "Claim to operationalise", text: claimText }],
    outputSchema: GenerateEvidenceRequirementOutputSchema,
    schemaName: "generate_evidence_requirement_output",
  });

  const now = new Date().toISOString();
  const requirement = parseOrThrow(
    EvidenceRequirementSchema,
    {
      id: crypto.randomUUID(),
      projectId,
      claimId: ctx.id,
      metric: out.metric,
      operator: out.operator,
      threshold: out.threshold,
      successCriterion: out.successCriterion,
      falsificationCriterion: out.falsificationCriterion,
      measurementMethod: out.measurementMethod,
      requiredObservations: out.requiredObservations ?? [],
      createdAt: now,
      updatedAt: now,
    },
    "EvidenceRequirement",
  );
  appendToProjectList(evidenceRequirementsByProject, projectId, requirement);
  return requirement;
}
