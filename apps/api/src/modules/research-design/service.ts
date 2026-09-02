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
  EvidenceRequirementSchema,
  ExperimentPlanOutputSchema,
  ExperimentPlanSchema,
  GapProposalOutputSchema,
  SourceDocumentSchema,
  SpecGraphViewSchema,
  type AtomicClaim,
  type ClaimDesignOutput,
  type Contribution,
  type EvidenceRequirement,
  type ExperimentPlan,
  type GapProposalOutput,
} from "@specloop/schemas";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import {
  GAP_PROPOSAL_SYSTEM_PROMPT,
  CLAIM_DESIGN_SYSTEM_PROMPT,
  EXPERIMENT_PLAN_SYSTEM_PROMPT,
} from "./prompt.js";
import { structuredCall } from "../../llm/structured-call.js";
import { parseOrThrow } from "../../store/project-store.js";
import { getDb } from "../../db/client.js";
import {
  atomicClaims,
  contributions,
  evidenceRequirements,
  experimentPlans,
  gapProposals,
  projects,
  sources,
  specGraphs,
} from "../../db/schema.js";

function ensureProjectExists(projectId: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.insert(projects)
    .values({
      id: projectId,
      title: "Test Project",
      domain: null,
      rawIdea: "placeholder",
      resourceConstraints: "[]",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .run();
}

function ensureSpecGraphExists(projectId: string): void {
  const db = getDb();
  const existing = db.select().from(specGraphs).where(eq(specGraphs.projectId, projectId)).get();
  if (existing) return;
  ensureProjectExists(projectId);
  const now = new Date().toISOString();
  const placeholder = {
    projectId,
    nodes: [],
    relations: [],
    warnings: [],
    statusHistory: [],
  };
  db.insert(specGraphs)
    .values({
      projectId,
      interpretationId: null,
      data: JSON.stringify(placeholder),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .run();
}

function ensureGapProposalExists(projectId: string): string {
  const db = getDb();
  const existing = db.select().from(gapProposals).where(eq(gapProposals.projectId, projectId)).orderBy(desc(gapProposals.createdAt)).get();
  if (existing) return existing.id;
  ensureSpecGraphExists(projectId);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const placeholder = {
    candidates: [],
    warning: "placeholder",
  };
  db.insert(gapProposals)
    .values({
      id,
      projectId,
      specGraphProjectId: projectId,
      data: JSON.stringify(placeholder),
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

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

function fetchGapProposal(projectId: string): GapProposalOutput | null {
  const db = getDb();
  const row = db.select().from(gapProposals).where(eq(gapProposals.projectId, projectId)).orderBy(desc(gapProposals.createdAt)).get();
  if (!row) return null;
  return parseOrThrow(GapProposalOutputSchema, JSON.parse(row.data as string), "GapProposalOutput");
}

function fetchAtomicClaims(projectId: string): AtomicClaim[] {
  const db = getDb();
  const rows = db.select().from(atomicClaims).where(eq(atomicClaims.projectId, projectId)).all();
  return rows.map((r) => parseOrThrow(AtomicClaimSchema, JSON.parse(r.data as string), "AtomicClaim"));
}

/** Build corpus-bounded context for gap proposal. */
export function selectedCorpusContext(projectId: string): {
  titles: string[];
  abstracts: string[];
  sourceIds: string[];
} {
  const db = getDb();
  // Try SQL json_extract filter for efficiency
  let selected: ReturnType<typeof fetchSources>;
  try {
    const rows = db
      .select()
      .from(sources)
      .where(and(eq(sources.projectId, projectId), sql`json_extract(${sources.data}, '$.selected') = 1`))
      .all();
    if (rows.length > 0) {
      selected = rows.map((r) => parseOrThrow(SourceDocumentSchema, JSON.parse(r.data as string), "SourceDocument"));
    } else {
      const all = fetchSources(projectId);
      const filtered = all.filter((s) => s.selected);
      // If json_extract returned 0 but we know there are selected, fallback to filtered
      selected = filtered.length > 0 && rows.length === 0 ? filtered : rows.map((r) => parseOrThrow(SourceDocumentSchema, JSON.parse(r.data as string), "SourceDocument"));
      if (selected.length === 0 && filtered.length > 0) selected = filtered;
    }
  } catch {
    const list = fetchSources(projectId);
    selected = list.filter((s) => s.selected);
  }
  // Fallback to JS filter if needed to ensure correctness
  if (selected.length === 0) {
    const all = fetchSources(projectId);
    selected = all.filter((s) => s.selected);
    // If we still have zero but SQL path gave zero, keep filtered
  } else {
    // Ensure we actually have selected=true; if SQL path incorrectly returned unselected due to fallback, re-filter
    const hasUnselected = selected.some((s) => !s.selected);
    if (hasUnselected) {
      selected = selected.filter((s) => s.selected);
    }
  }
  return {
    titles: selected.map((s) => s.title),
    abstracts: selected.map((s) => s.abstract),
    sourceIds: selected.map((s) => s.id),
  };
}

/**
 * Extract the decomposition research-question context for gap proposal
 * (AIT-06). When `researchQuestionNodeIds` is provided, only those nodes are
 * used and each must exist in the project's graph as a RESEARCH_QUESTION
 * node; otherwise every RESEARCH_QUESTION node in the project's graph feeds
 * the prompt. Projects without a graph contribute no question context.
 */
export function researchQuestionContext(
  projectId: string,
  researchQuestionNodeIds: string[],
): { id: string; title: string; content: string; status: string }[] {
  const graph = fetchSpecGraph(projectId);
  const questionNodes = new Map(
    (graph?.nodes ?? [])
      .filter((n) => n.type === "RESEARCH_QUESTION")
      .map((n) => [n.id, n]),
  );

  if (researchQuestionNodeIds.length === 0) {
    return [...questionNodes.values()].map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      status: n.status,
    }));
  }

  return researchQuestionNodeIds.map((id) => {
    const node = questionNodes.get(id);
    if (!node) {
      throw new Error(
        `Research question node ${id} not found in the decomposition of project ${projectId}.`,
      );
    }
    return { id: node.id, title: node.title, content: node.content, status: node.status };
  });
}

/** AIT-06: propose corpus-bounded gap candidates grounded in the selected corpus and the project's decomposition. */
export async function generateGapProposal(params: {
  projectId: string;
  /** Research-question node ids from the Step-2 graph; empty = all of them. */
  researchQuestionNodeIds?: string[];
  client: any;
  model: string;
}): Promise<GapProposalOutput> {
  const { projectId, client, model } = params;
  const corpus = selectedCorpusContext(projectId);
  if (corpus.sourceIds.length === 0) {
    throw new Error("Select at least one source into the corpus before proposing a gap.");
  }
  const questions = researchQuestionContext(projectId, params.researchQuestionNodeIds ?? []);

  const corpusText = corpus.titles
    .map((t, i) => `Source ${corpus.sourceIds[i]}: ${t}\n${corpus.abstracts[i]}`)
    .join("\n\n");

  const untrusted = [{ label: "Selected corpus", text: corpusText }];
  if (questions.length > 0) {
    const questionsText = questions
      .map((q) => `Research question ${q.id} [${q.status}]: ${q.title}\n${q.content}`)
      .join("\n\n");
    untrusted.push({
      label: "Research questions from the confirmed idea decomposition",
      text: questionsText,
    });
  }

  const allowedIds = new Set(corpus.sourceIds);
  const proposal = await structuredCall<GapProposalOutput>({
    client,
    model,
    systemPrompt: GAP_PROPOSAL_SYSTEM_PROMPT,
    userPrompt:
      "Propose 1–3 research gap candidates grounded in BOTH inputs below: the selected literature corpus AND the project's decomposition research questions (when provided). Only reference the source IDs provided. Every candidate must include a novelty_risk warning.",
    untrusted,
    outputSchema: GapProposalOutputSchema,
    schemaName: "gap_proposal_output",
    allowedIds,
    extractReferencedIds: (out) => [
      ...out.candidates.flatMap((c) => c.evidenceRefs),
      ...out.candidates.flatMap((c) => c.nearestWorkIds),
    ],
  });

  ensureSpecGraphExists(projectId);
  const db = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  db.insert(gapProposals)
    .values({
      id,
      projectId,
      specGraphProjectId: projectId,
      data: JSON.stringify(proposal),
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return proposal;
}

function inferEvidenceOperator(expectedDirection: string): EvidenceRequirement["operator"] {
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

function buildEvidenceRequirementForClaim(
  projectId: string,
  claim: AtomicClaim,
): EvidenceRequirement {
  const operator = inferEvidenceOperator(claim.expectedDirection);
  const threshold = `Not (${claim.falsificationCondition}) — satisfies ${claim.expectedDirection} on ${claim.metric}`;
  const successCriterion = `Claim "${claim.text}" is verified if ${claim.metric} measured on ${claim.datasetDomain} in scope "${claim.scope}" vs baseline ${claim.baseline} shows ${claim.expectedDirection} and does not satisfy falsification condition: ${claim.falsificationCondition}.`;
  const measurementMethod = `Measure ${claim.metric} on ${claim.datasetDomain} against baseline ${claim.baseline} within scope ${claim.scope}.`;
  const now = new Date().toISOString();
  return parseOrThrow(
    EvidenceRequirementSchema,
    {
      id: crypto.randomUUID(),
      projectId,
      claimId: claim.id,
      metric: claim.metric,
      operator,
      threshold: threshold.slice(0, 500),
      successCriterion: successCriterion.slice(0, 2000),
      falsificationCriterion: claim.falsificationCondition,
      measurementMethod: measurementMethod.slice(0, 2000),
      requiredObservations: [claim.metric],
      createdAt: now,
      updatedAt: now,
    },
    "EvidenceRequirement",
  );
}

/** AIT-07: generate contributions and atomic claims from a selected gap. */
export async function generateClaimDesign(params: {
  projectId: string;
  selectedGapIndex: number;
  client: any;
  model: string;
}): Promise<ClaimDesignOutput & { persistedClaims: AtomicClaim[]; persistedContributions: Contribution[]; persistedEvidenceRequirements: EvidenceRequirement[] }> {
  const { projectId, selectedGapIndex, client, model } = params;

  const proposal = fetchGapProposal(projectId);
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
    schemaName: "claim_design_output",
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
  // Replace with direct Drizzle: delete existing then insert
  const db = getDb();
  // Ensure FK gapProposal exists; fetch latest gapProposal id for FK
  const gapRow = db.select().from(gapProposals).where(eq(gapProposals.projectId, projectId)).orderBy(desc(gapProposals.createdAt)).get();
  const gapProposalId = gapRow?.id ?? ensureGapProposalExists(projectId);
  for (const claim of persistedClaims) {
    db.insert(atomicClaims)
      .values({
        id: claim.id,
        projectId,
        gapProposalId,
        data: JSON.stringify(claim),
        createdAt: claim.createdAt,
        updatedAt: claim.updatedAt,
      })
      .run();
  }

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
  for (const contrib of persistedContributions) {
    db.insert(contributions)
      .values({
        id: contrib.id,
        projectId,
        gapProposalId,
        data: JSON.stringify(contrib),
        createdAt: contrib.createdAt,
      })
      .run();
  }

  // Auto-generate evidence requirements for each new claim so the user does
  // not have to run a second process manually. Deterministic, no extra LLM
  // call — the LLM-backed `evidence.generateEvidenceForClaim` remains
  // available for per-claim regeneration.
  const persistedEvidenceRequirements: EvidenceRequirement[] = persistedClaims.map((claim) =>
    buildEvidenceRequirementForClaim(projectId, claim),
  );
  for (const req of persistedEvidenceRequirements) {
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
  }

  // Return design with persisted IDs substituted.
  return {
    contributions: persistedContributions.map((c) => ({ text: c.text, claimIds: c.claimIds })),
    claims: design.claims,
    persistedClaims,
    persistedContributions,
    persistedEvidenceRequirements,
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

  const claims = fetchAtomicClaims(projectId);
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
    schemaName: "experiment_plan_output",
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
  const db = getDb();
  const gapProposalId = ensureGapProposalExists(projectId);
  db.insert(experimentPlans)
    .values({
      id: plan.id,
      projectId,
      gapProposalId,
      data: JSON.stringify(plan),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    })
    .run();
  return plan;
}
