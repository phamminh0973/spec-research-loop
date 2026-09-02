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
  AtomicClaimSchema,
  SourceDocumentSchema,
  SpecGraphViewSchema,
  type EvidenceRequirement,
  type EvidenceSpan,
  type GenerateEvidenceRequirementOutput,
} from "@specloop/schemas";
import { eq, and, sql } from "drizzle-orm";
import { EVIDENCE_REQUIREMENT_SYSTEM_PROMPT } from "./prompt.js";
import { structuredCall } from "../../llm/structured-call.js";
import { parseOrThrow } from "../../store/project-store.js";
import { getDb } from "../../db/client.js";
import {
  atomicClaims,
  evidenceRequirements,
  evidenceSpans,
  sources,
  specGraphs,
} from "../../db/schema.js";

// ---------------------------------------------------------------------------
// Document spans (source provenance — not claim–evidence links)
// ---------------------------------------------------------------------------

function fetchSources(projectId: string) {
  const db = getDb();
  const rows = db.select().from(sources).where(eq(sources.projectId, projectId)).all();
  return rows.map((r) => parseOrThrow(SourceDocumentSchema, JSON.parse(r.data as string), "SourceDocument"));
}

function fetchSpecGraph(projectId: string) {
  const db = getDb();
  const row = db.select().from(specGraphs).where(eq(specGraphs.projectId, projectId)).get();
  return row ? parseOrThrow(SpecGraphViewSchema, JSON.parse(row.data as string), "SpecGraphView") : null;
}

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

  const db = getDb();
  const sourceRow = db.select().from(sources).where(and(eq(sources.projectId, projectId), eq(sources.id, sourceId))).get();
  if (!sourceRow) {
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
  db.insert(evidenceSpans)
    .values({
      id: span.id,
      projectId,
      sourceId,
      data: JSON.stringify(span),
      createdAt: span.createdAt,
    })
    .run();
  return span;
}

export function listSpans(params: {
  projectId: string;
  sourceId?: string;
  limit?: number;
}): { items: EvidenceSpan[] } {
  const { projectId, sourceId, limit = 100 } = params;
  const db = getDb();
  const rows = sourceId
    ? db.select().from(evidenceSpans).where(and(eq(evidenceSpans.projectId, projectId), eq(evidenceSpans.sourceId, sourceId))).all()
    : db.select().from(evidenceSpans).where(eq(evidenceSpans.projectId, projectId)).all();
  const all = rows.map((r) => parseOrThrow(EvidenceSpanSchema, JSON.parse(r.data as string), "EvidenceSpan"));
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
  const db = getDb();
  const claimRow = db.select().from(atomicClaims).where(and(eq(atomicClaims.projectId, projectId), eq(atomicClaims.id, claimId))).get();
  if (claimRow) {
    const ac = parseOrThrow(AtomicClaimSchema, JSON.parse(claimRow.data as string), "AtomicClaim");
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
  const graph = fetchSpecGraph(projectId);
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
  const db = getDb();
  const rows = claimId
    ? db.select().from(evidenceRequirements).where(and(eq(evidenceRequirements.projectId, projectId), eq(evidenceRequirements.claimId, claimId))).all()
    : db.select().from(evidenceRequirements).where(eq(evidenceRequirements.projectId, projectId)).all();
  const all = rows.map((r) => parseOrThrow(EvidenceRequirementSchema, JSON.parse(r.data as string), "EvidenceRequirement"));
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
  const db = getDb();
  const allClaimRows = db.select().from(atomicClaims).where(eq(atomicClaims.projectId, projectId)).all();
  let targetClaimRows = allClaimRows;
  if (claimIds) {
    const idSet = new Set(claimIds);
    targetClaimRows = allClaimRows.filter((r) => idSet.has(r.id));
  }

  // LEFT JOIN evidence_requirements to find which claims already have requirements
  const joined = db
    .select({
      claimId: atomicClaims.id,
      requirementData: evidenceRequirements.data,
    })
    .from(atomicClaims)
    .leftJoin(evidenceRequirements, eq(evidenceRequirements.claimId, atomicClaims.id))
    .where(eq(atomicClaims.projectId, projectId))
    .all();

  const reqByClaim = new Map<string, EvidenceRequirement>();
  for (const row of joined) {
    if (row.requirementData) {
      const req = parseOrThrow(EvidenceRequirementSchema, JSON.parse(row.requirementData as string), "EvidenceRequirement");
      reqByClaim.set(row.claimId, req);
    }
  }

  const ids = claimIds ?? targetClaimRows.map((r) => r.id);
  const created: EvidenceRequirement[] = [];
  // Also need to handle spec-graph claimIds not in atomicClaims; ensure they are considered
  const idsToProcess = claimIds ?? ids;
  for (const claimId of idsToProcess) {
    if (reqByClaim.has(claimId)) {
      created.push(reqByClaim.get(claimId)!);
      continue;
    }
    // Check if already has requirement but not in join due to project filter mismatch (spec graph nodes)
    const existingRow = db.select().from(evidenceRequirements).where(and(eq(evidenceRequirements.projectId, projectId), eq(evidenceRequirements.claimId, claimId))).get();
    if (existingRow) {
      const existing = parseOrThrow(EvidenceRequirementSchema, JSON.parse(existingRow.data as string), "EvidenceRequirement");
      created.push(existing);
      continue;
    }
    try {
      const ctx = resolveClaimContext(projectId, claimId);
      const req = buildDeterministicEvidenceRequirement(projectId, ctx);
      db.insert(evidenceRequirements)
        .values({
          id: req.id,
          projectId,
          claimId: req.claimId,
          data: JSON.stringify(req),
          createdAt: req.createdAt,
          updatedAt: req.updatedAt,
        })
        .run();
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
  const db = getDb();
  const ids = claimIds ?? db.select().from(atomicClaims).where(eq(atomicClaims.projectId, projectId)).all().map((r) => r.id);
  const results: EvidenceRequirement[] = [];
  for (const claimId of ids) {
    const existingRow = db.select().from(evidenceRequirements).where(and(eq(evidenceRequirements.projectId, projectId), eq(evidenceRequirements.claimId, claimId))).get();
    if (existingRow) {
      results.push(parseOrThrow(EvidenceRequirementSchema, JSON.parse(existingRow.data as string), "EvidenceRequirement"));
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
  const db = getDb();
  db.insert(evidenceRequirements)
    .values({
      id: requirement.id,
      projectId,
      claimId: requirement.claimId,
      data: JSON.stringify(requirement),
      createdAt: requirement.createdAt,
      updatedAt: requirement.updatedAt,
    })
    .run();
  return requirement;
}
