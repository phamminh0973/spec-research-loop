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
  AtomicClaimSchema,
  EvidenceEntryTypeSchema,
  type EvidenceRequirement,
  EvidenceRequirementSchema,
  type EvidenceSpan,
  EvidenceSpanSchema,
  type GenerateEvidenceRequirementOutput,
  GenerateEvidenceRequirementOutputSchema,
  SourceDocumentSchema,
  SpecGraphViewSchema,
} from "@specloop/schemas";
import { and, eq } from "drizzle-orm";
import type OpenAI from "openai";
import { getDb } from "../../db/client.js";
import {
  atomicClaims,
  evidenceRequirements,
  evidenceSpans,
  sources,
  specGraphs,
} from "../../db/schema.js";
import { structuredCall } from "../../llm/structured-call.js";
import { parseOrThrow } from "../../store/project-store.js";
import { EVIDENCE_REQUIREMENT_SYSTEM_PROMPT } from "./prompt.js";

// ---------------------------------------------------------------------------
// Document spans (source provenance — not claim–evidence links)
// ---------------------------------------------------------------------------

function _fetchSources(projectId: string) {
  const db = getDb();
  const rows = db
    .select()
    .from(sources)
    .where(eq(sources.projectId, projectId))
    .all();
  return rows.map((r) =>
    parseOrThrow(
      SourceDocumentSchema,
      JSON.parse(r.data as string),
      "SourceDocument"
    )
  );
}

function fetchSpecGraph(projectId: string) {
  const db = getDb();
  const row = db
    .select()
    .from(specGraphs)
    .where(eq(specGraphs.projectId, projectId))
    .get();
  return row
    ? parseOrThrow(
        SpecGraphViewSchema,
        JSON.parse(row.data as string),
        "SpecGraphView"
      )
    : null;
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
  const {
    projectId,
    sourceId,
    page,
    startOffset,
    endOffset,
    exactText,
    entryType,
  } = params;

  const db = getDb();
  const sourceRow = db
    .select()
    .from(sources)
    .where(and(eq(sources.projectId, projectId), eq(sources.id, sourceId)))
    .get();
  if (!sourceRow) {
    throw new Error(`Source ${sourceId} not found in project ${projectId}.`);
  }

  const hasOffsets = page != null && startOffset != null && endOffset != null;
  const inferredType = entryType ?? (hasOffsets ? "EXACT" : "MANUAL");
  const entry = EvidenceEntryTypeSchema.parse(inferredType);

  if (entry === "EXACT" && !hasOffsets) {
    throw new Error(
      "EXACT evidence spans require page, startOffset and endOffset."
    );
  }
  if (
    entry === "EXACT" &&
    startOffset != null &&
    endOffset != null &&
    endOffset < startOffset
  ) {
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
    "EvidenceSpan"
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
    ? db
        .select()
        .from(evidenceSpans)
        .where(
          and(
            eq(evidenceSpans.projectId, projectId),
            eq(evidenceSpans.sourceId, sourceId)
          )
        )
        .all()
    : db
        .select()
        .from(evidenceSpans)
        .where(eq(evidenceSpans.projectId, projectId))
        .all();
  const all = rows.map((r) =>
    parseOrThrow(
      EvidenceSpanSchema,
      JSON.parse(r.data as string),
      "EvidenceSpan"
    )
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

export function resolveClaimContext(
  projectId: string,
  claimId: string
): ClaimContext {
  const db = getDb();
  const claimRow = db
    .select()
    .from(atomicClaims)
    .where(
      and(eq(atomicClaims.projectId, projectId), eq(atomicClaims.id, claimId))
    )
    .get();
  if (claimRow) {
    const ac = parseOrThrow(
      AtomicClaimSchema,
      JSON.parse(claimRow.data as string),
      "AtomicClaim"
    );
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
    ? db
        .select()
        .from(evidenceRequirements)
        .where(
          and(
            eq(evidenceRequirements.projectId, projectId),
            eq(evidenceRequirements.claimId, claimId)
          )
        )
        .all()
    : db
        .select()
        .from(evidenceRequirements)
        .where(eq(evidenceRequirements.projectId, projectId))
        .all();
  const all = rows.map((r) =>
    parseOrThrow(
      EvidenceRequirementSchema,
      JSON.parse(r.data as string),
      "EvidenceRequirement"
    )
  );
  return { items: all };
}



export async function generateEvidenceRequirementsForClaims(params: {
  projectId: string;
  claimIds?: string[];
  client: OpenAI;
  model: string;
}): Promise<EvidenceRequirement[]> {
  const { projectId, claimIds, client, model } = params;
  const db = getDb();
  const ids =
    claimIds ??
    db
      .select()
      .from(atomicClaims)
      .where(eq(atomicClaims.projectId, projectId))
      .all()
      .map((r) => r.id);
  const results: EvidenceRequirement[] = [];
  for (const claimId of ids) {
    const existingRow = db
      .select()
      .from(evidenceRequirements)
      .where(
        and(
          eq(evidenceRequirements.projectId, projectId),
          eq(evidenceRequirements.claimId, claimId)
        )
      )
      .get();
    if (existingRow) {
      results.push(
        parseOrThrow(
          EvidenceRequirementSchema,
          JSON.parse(existingRow.data as string),
          "EvidenceRequirement"
        )
      );
      continue;
    }
    const req = await generateEvidenceRequirement({
      projectId,
      claimId,
      client,
      model,
    });
    results.push(req);
  }
  return results;
}

export async function generateEvidenceRequirement(params: {
  projectId: string;
  claimId: string;
  client: OpenAI;
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

  // Enforce concrete numeric threshold
  if (!/\d/.test(out.threshold) || !/\d/.test(out.successCriterion)) {
    throw new Error(
      `Evidence requirement threshold must be concrete numeric value; got threshold="${out.threshold}", successCriterion="${out.successCriterion}".`
    );
  }

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
    "EvidenceRequirement"
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
