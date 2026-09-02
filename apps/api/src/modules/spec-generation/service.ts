/**
 * Spec-generation service (AIT-10, Bước 8 in the assignment).
 *
 * Assembles the mandatory 14-section research specification purely by
 * formatting data that earlier, human-gated steps already produced
 * (interpretation, decomposition, literature, research-design, evidence).
 * This module makes NO LLM call and proposes no new content — every fact
 * in a rendered section already went through its own confirmation/review
 * step upstream. That is deliberate: Bước 8 in the assignment is framed as
 * assembling the spec from what already exists, not generating anything
 * new, so there is nothing here for a human to additionally confirm.
 *
 * Each section is built by its own small, pure, exported function so it
 * can be unit-tested in isolation without touching the store or the LLM.
 */

import {
  ResearchSpecSchema,
  SPEC_SECTION_ORDER,
  type AtomicClaim,
  type Contribution,
  type EvidenceRequirement,
  type ExperimentPlan,
  type FindingResolution,
  type GapProposalOutput,
  type InterpretationDecision,
  type InterpretationRecord,
  type NodeStatusHistory,
  type ResearchSpec,
  type SourceDocument,
  type SpecNode,
  type SpecSection,
} from "@specloop/schemas";
import { MarkdownDocument, md } from "build-md";
import { interpretationRepository } from "../interpretation/index.js";
import {
  atomicClaimsByProject,
  contributionsByProject,
  evidenceRequirementsByProject,
  experimentPlansByProject,
  findingResolutionsByProject,
  gapProposalsByProject,
  interpretationDecisionsByProject,
  parseOrThrow,
  researchSpecsByProject,
  sourcesByProject,
  specGraphsByProject,
} from "../../store/project-store.js";

const PLACEHOLDER_PREFIX = "(chưa có dữ liệu)";

function section(
  id: SpecSection["id"],
  title: string,
  content: string,
  isPlaceholder: boolean,
): SpecSection {
  return { id, title, content, isPlaceholder };
}

function nodesByType(nodes: SpecNode[], type: SpecNode["type"]): SpecNode[] {
  return nodes.filter((n) => n.type === type);
}

// ---------------------------------------------------------------------------
// Section builders — one per section, each pure and independently testable.
// ---------------------------------------------------------------------------

/** 1. Problem statement — confirmed interpretation + PROBLEM nodes. */
export function buildProblemStatementSection(
  interpretation: InterpretationRecord | null,
  problemNodes: SpecNode[],
): SpecSection {
  const isPlaceholder = !interpretation && problemNodes.length === 0;
  if (isPlaceholder) {
    return section(
      "PROBLEM_STATEMENT",
      "1. Problem statement",
      `${PLACEHOLDER_PREFIX} — chưa có interpretation đã xác nhận hoặc PROBLEM node.`,
      true,
    );
  }
  const doc = new MarkdownDocument()
    .paragraph(interpretation?.output.simpleInterpretation)
    .$if(problemNodes.length > 0, (d) =>
      d
        .paragraph("Problem nodes (Bước 2):")
        .list(problemNodes.map((n) => `[${n.status}] ${n.title}: ${n.content}`)),
    );
  return section("PROBLEM_STATEMENT", "1. Problem statement", doc.toString().trim(), false);
}

/** 2. Research questions — RESEARCH_QUESTION nodes. */
export function buildResearchQuestionsSection(questionNodes: SpecNode[]): SpecSection {
  const isPlaceholder = questionNodes.length === 0;
  if (isPlaceholder) {
    return section(
      "RESEARCH_QUESTIONS",
      "2. Research questions",
      `${PLACEHOLDER_PREFIX} — chưa có RESEARCH_QUESTION node nào.`,
      true,
    );
  }
  const doc = new MarkdownDocument().list(
    questionNodes.map((n) => `[${n.status}] ${n.content}`),
  );
  return section("RESEARCH_QUESTIONS", "2. Research questions", doc.toString().trim(), false);
}

/** 3. Related-work matrix — selected sources with LLM-proposed analysis (user-reviewed). */
export function buildRelatedWorkMatrixSection(sources: SourceDocument[]): SpecSection {
  const selected = sources.filter((s) => s.selected);
  const isPlaceholder = selected.length === 0;
  if (isPlaceholder) {
    return section(
      "RELATED_WORK_MATRIX",
      "3. Related-work matrix",
      `${PLACEHOLDER_PREFIX} — chưa có nguồn nào được chọn vào corpus.`,
      true,
    );
  }
  const doc = new MarkdownDocument().table(
    ["Nghiên cứu", "Đã làm gì", "Phương pháp", "Điểm cần nghiên cứu thêm"],
    selected.map((s) => {
      const analysis = s.analysis;
      const href = s.url ?? (s.doi ? `https://doi.org/${s.doi}` : null);
      const titleCell = href ? md`${md.link(href, s.title)}` : s.title;
      return [
        titleCell,
        analysis?.achievedOutcome ?? "—",
        analysis?.methodology ?? "—",
        analysis?.additionalResearchNeeded ?? "—",
      ];
    }),
  );
  return section("RELATED_WORK_MATRIX", "3. Related-work matrix", doc.toString().trim(), false);
}

/** 4. Research gap — GAP nodes + most recent gap proposal (always carries novelty-risk warning). */
export function buildResearchGapSection(
  gapNodes: SpecNode[],
  gapProposal: GapProposalOutput | null,
): SpecSection {
  const isPlaceholder = gapNodes.length === 0 && !gapProposal;
  if (isPlaceholder) {
    return section(
      "RESEARCH_GAP",
      "4. Research gap",
      `${PLACEHOLDER_PREFIX} — chưa có GAP node hoặc gap proposal.`,
      true,
    );
  }
  const doc = new MarkdownDocument()
    .$if(gapNodes.length > 0, (d) =>
      d
        .paragraph("Gap nodes (Bước 2):")
        .list(gapNodes.map((n) => `[${n.status}] ${n.content}`)),
    )
    .$if(!!gapProposal, (d) =>
      d
        .paragraph("Gap candidates (AIT-06):")
        .list(
          "ordered",
          gapProposal!.candidates.map(
            (c) => `${c.limitation} (importance: ${c.importance})\n   novelty risk: ${c.noveltyRisk}`,
          ),
        )
        .paragraph(`Warning: ${gapProposal!.warning}`),
    );
  return section("RESEARCH_GAP", "4. Research gap", doc.toString().trim(), false);
}

/** 5. Proposed approach — synthesized from contribution text (no new content, only formatting). */
export function buildProposedApproachSection(contributions: Contribution[]): SpecSection {
  const isPlaceholder = contributions.length === 0;
  if (isPlaceholder) {
    return section(
      "PROPOSED_APPROACH",
      "5. Proposed approach",
      `${PLACEHOLDER_PREFIX} — chưa có contribution nào được tạo.`,
      true,
    );
  }
  const doc = new MarkdownDocument().paragraph(contributions.map((c) => c.text).join(" "));
  return section("PROPOSED_APPROACH", "5. Proposed approach", doc.toString().trim(), false);
}

/** 6. Expected contributions — contribution records with linked claim counts. */
export function buildExpectedContributionsSection(contributions: Contribution[]): SpecSection {
  const isPlaceholder = contributions.length === 0;
  if (isPlaceholder) {
    return section(
      "EXPECTED_CONTRIBUTIONS",
      "6. Expected contributions",
      `${PLACEHOLDER_PREFIX} — chưa có contribution nào được tạo.`,
      true,
    );
  }
  const doc = new MarkdownDocument().list(
    contributions.map((c) => `${c.text} (${c.claimIds.length} claim liên kết)`),
  );
  return section("EXPECTED_CONTRIBUTIONS", "6. Expected contributions", doc.toString().trim(), false);
}

/** 7. Claim–evidence matrix — every claim's verifiable evidence requirement (what the metric value must satisfy). */
export function buildClaimEvidenceMatrixSection(
  claims: AtomicClaim[],
  requirements: EvidenceRequirement[],
): SpecSection {
  const isPlaceholder = claims.length === 0;
  if (isPlaceholder) {
    return section(
      "CLAIM_EVIDENCE_MATRIX",
      "7. Claim–evidence matrix",
      `${PLACEHOLDER_PREFIX} — chưa có atomic claim nào được tạo.`,
      true,
    );
  }
  const reqByClaim = new Map(requirements.map((r) => [r.claimId, r]));
  const rows: string[][] = [];
  for (const claim of claims) {
    const req = reqByClaim.get(claim.id);
    if (!req) {
      rows.push([claim.text, claim.metric, "—", "—", "(chưa có evidence requirement — cần xác định metric/threshold)"]);
    } else {
      rows.push([
        claim.text,
        req.metric,
        `${req.operator} ${req.threshold}`,
        req.successCriterion,
        req.falsificationCriterion,
      ]);
    }
  }
  const doc = new MarkdownDocument().table(
    ["Claim", "Metric", "Operator / Threshold", "Success criterion (verified if)", "Falsification (fails if)"],
    rows,
  );
  return section("CLAIM_EVIDENCE_MATRIX", "7. Claim–evidence matrix", doc.toString().trim(), false);
}

/** 8. Experimental protocol — protocol steps + controls across all plans. */
export function buildExperimentalProtocolSection(plans: ExperimentPlan[]): SpecSection {
  const isPlaceholder = plans.length === 0;
  if (isPlaceholder) {
    return section(
      "EXPERIMENTAL_PROTOCOL",
      "8. Experimental protocol",
      `${PLACEHOLDER_PREFIX} — chưa có experiment plan nào được tạo.`,
      true,
    );
  }
  const doc = new MarkdownDocument().$foreach(plans, (d, p) =>
    d
      .paragraph(`Plan [tier ${p.tier}]:`)
      .paragraph("Protocol:")
      .list(p.protocol.length > 0 ? p.protocol : ["(none)"])
      .paragraph("Controls:")
      .list(p.controls.length > 0 ? p.controls : ["(none)"]),
  );
  return section("EXPERIMENTAL_PROTOCOL", "8. Experimental protocol", doc.toString().trim(), false);
}

/** 9. Baselines and metrics. */
export function buildBaselinesAndMetricsSection(plans: ExperimentPlan[]): SpecSection {
  const isPlaceholder = plans.length === 0;
  if (isPlaceholder) {
    return section(
      "BASELINES_AND_METRICS",
      "9. Baselines and metrics",
      `${PLACEHOLDER_PREFIX} — chưa có experiment plan nào được tạo.`,
      true,
    );
  }
  const doc = new MarkdownDocument().$foreach(plans, (d, p) =>
    d
      .paragraph("Baselines:")
      .list(p.baselines.length > 0 ? p.baselines : ["(none)"])
      .paragraph("Metrics:")
      .list(p.metrics.length > 0 ? p.metrics : ["(none)"]),
  );
  return section("BASELINES_AND_METRICS", "9. Baselines and metrics", doc.toString().trim(), false);
}

/** 10. Ablation plan — at least one is required per AI design §8. */
export function buildAblationPlanSection(plans: ExperimentPlan[]): SpecSection {
  const ablations = plans.flatMap((p) => p.ablations);
  const isPlaceholder = ablations.length === 0;
  if (isPlaceholder) {
    return section(
      "ABLATION_PLAN",
      "10. Ablation plan",
      `${PLACEHOLDER_PREFIX} — chưa có ablation nào được đề xuất.`,
      true,
    );
  }
  const doc = new MarkdownDocument().list(ablations);
  return section("ABLATION_PLAN", "10. Ablation plan", doc.toString().trim(), false);
}

/** 11. Compute budget — resource estimates, each input labeled assumed/measured. */
export function buildComputeBudgetSection(plans: ExperimentPlan[]): SpecSection {
  const estimates = plans.flatMap((p) => p.estimates);
  const isPlaceholder = estimates.length === 0;
  if (isPlaceholder) {
    return section(
      "COMPUTE_BUDGET",
      "11. Compute budget",
      `${PLACEHOLDER_PREFIX} — chưa có resource estimate nào.`,
      true,
    );
  }
  const doc = new MarkdownDocument().$foreach(estimates, (d, e) => {
    const inputs = e.inputs.map((i) => `${i.name}=${i.value}[${i.basis}]`).join(", ") || "none";
    return d.paragraph(`${e.label}: ${e.result} (formula: ${e.formula}; inputs: ${inputs})`);
  });
  return section("COMPUTE_BUDGET", "11. Compute budget", doc.toString().trim(), false);
}

/** 12. Risks and limitations — RISK nodes + every gap candidate's novelty-risk warning. */
export function buildRisksAndLimitationsSection(
  riskNodes: SpecNode[],
  gapProposal: GapProposalOutput | null,
): SpecSection {
  const isPlaceholder = riskNodes.length === 0 && !gapProposal;
  if (isPlaceholder) {
    return section(
      "RISKS_AND_LIMITATIONS",
      "12. Risks and limitations",
      `${PLACEHOLDER_PREFIX} — chưa có RISK node hoặc gap proposal.`,
      true,
    );
  }
  const doc = new MarkdownDocument()
    .$if(riskNodes.length > 0, (d) =>
      d.list(riskNodes.map((n) => `[${n.status}] ${n.content}`)),
    )
    .$if(!!gapProposal, (d) =>
      d.paragraph(`Novelty-risk warning (BR-04): ${gapProposal!.warning}`),
    );
  return section("RISKS_AND_LIMITATIONS", "12. Risks and limitations", doc.toString().trim(), false);
}

/** 13. Open issues — OPEN_QUESTION nodes. */
export function buildOpenIssuesSection(openQuestionNodes: SpecNode[]): SpecSection {
  const isPlaceholder = openQuestionNodes.length === 0;
  if (isPlaceholder) {
    return section(
      "OPEN_ISSUES",
      "13. Open issues",
      `${PLACEHOLDER_PREFIX} — chưa có OPEN_QUESTION node nào.`,
      true,
    );
  }
  const doc = new MarkdownDocument().list(
    openQuestionNodes.map((n) => `[${n.status}] ${n.content}`),
  );
  return section("OPEN_ISSUES", "13. Open issues", doc.toString().trim(), false);
}

/** 14. Decision history — Step-1 confirm/edit/regenerate/other decisions + node status changes + Bước 10 finding resolutions. */
export function buildDecisionHistorySection(
  decisions: InterpretationDecision[],
  statusHistory: NodeStatusHistory[],
  findingResolutions: FindingResolution[] = [],
): SpecSection {
  const isPlaceholder =
    decisions.length === 0 && statusHistory.length === 0 && findingResolutions.length === 0;
  if (isPlaceholder) {
    return section(
      "DECISION_HISTORY",
      "14. Decision history",
      `${PLACEHOLDER_PREFIX} — chưa có quyết định nào được ghi nhận.`,
      true,
    );
  }
  const doc = new MarkdownDocument()
    .$if(decisions.length > 0, (d) =>
      d
        .paragraph("Bước 1 decisions:")
        .list(decisions.map((d2) => `[${d2.createdAt}] ${d2.action}${d2.content ? `: ${d2.content}` : ""}`)),
    )
    .$if(statusHistory.length > 0, (d) =>
      d
        .paragraph("Node status changes:")
        .list(statusHistory.map((h) => `[${h.occurredAt}] ${h.nodeId} ${h.fromStatus ?? "(new)"} → ${h.toStatus} (${h.actor}: ${h.reason})`)),
    )
    .$if(findingResolutions.length > 0, (d) =>
      d
        .paragraph("Bước 10 finding resolutions:")
        .list(findingResolutions.map((r) => `[${r.createdAt}] ${r.judge} / "${r.targetSection}" → ${r.resolution}: ${r.note}`)),
    );
  return section("DECISION_HISTORY", "14. Decision history", doc.toString().trim(), false);
}

// ---------------------------------------------------------------------------
// Assembly and persistence
// ---------------------------------------------------------------------------

/**
 * Pure assembly step: given already-fetched data, build all 14 sections in
 * canonical order. Exported for unit testing without touching the store.
 */
export function assembleSections(data: {
  interpretation: InterpretationRecord | null;
  graphNodes: SpecNode[];
  sources: SourceDocument[];
  gapProposal: GapProposalOutput | null;
  contributions: Contribution[];
  claims: AtomicClaim[];
  requirements: EvidenceRequirement[];
  plans: ExperimentPlan[];
  decisions: InterpretationDecision[];
  statusHistory: NodeStatusHistory[];
  findingResolutions?: FindingResolution[];
}): SpecSection[] {
  const sections: Record<(typeof SPEC_SECTION_ORDER)[number], SpecSection> = {
    PROBLEM_STATEMENT: buildProblemStatementSection(
      data.interpretation,
      nodesByType(data.graphNodes, "PROBLEM"),
    ),
    RESEARCH_QUESTIONS: buildResearchQuestionsSection(
      nodesByType(data.graphNodes, "RESEARCH_QUESTION"),
    ),
    RELATED_WORK_MATRIX: buildRelatedWorkMatrixSection(data.sources),
    RESEARCH_GAP: buildResearchGapSection(nodesByType(data.graphNodes, "GAP"), data.gapProposal),
    PROPOSED_APPROACH: buildProposedApproachSection(data.contributions),
    EXPECTED_CONTRIBUTIONS: buildExpectedContributionsSection(data.contributions),
    CLAIM_EVIDENCE_MATRIX: buildClaimEvidenceMatrixSection(data.claims, data.requirements),
    EXPERIMENTAL_PROTOCOL: buildExperimentalProtocolSection(data.plans),
    BASELINES_AND_METRICS: buildBaselinesAndMetricsSection(data.plans),
    ABLATION_PLAN: buildAblationPlanSection(data.plans),
    COMPUTE_BUDGET: buildComputeBudgetSection(data.plans),
    RISKS_AND_LIMITATIONS: buildRisksAndLimitationsSection(
      nodesByType(data.graphNodes, "RISK"),
      data.gapProposal,
    ),
    OPEN_ISSUES: buildOpenIssuesSection(nodesByType(data.graphNodes, "OPEN_QUESTION")),
    DECISION_HISTORY: buildDecisionHistorySection(
      data.decisions,
      data.statusHistory,
      data.findingResolutions ?? [],
    ),
  };
  return SPEC_SECTION_ORDER.map((id) => sections[id]);
}

/**
 * Generate a new research-spec version for a project by reading every
 * upstream module's current persisted state, assembling the 14 sections,
 * and appending a new version (versions are never overwritten — Bước 10
 * revisions must be able to diff against prior ones).
 *
 * `getConfirmedInterpretation` is injectable for tests; defaults to the
 * shared repository singleton used by the rest of the API.
 */
export async function generateResearchSpec(params: {
  projectId: string;
  getConfirmedInterpretation?: (
    projectId: string,
  ) => Promise<InterpretationRecord | null>;
}): Promise<ResearchSpec> {
  const { projectId } = params;
  const getConfirmedInterpretation =
    params.getConfirmedInterpretation ??
    ((id: string) => interpretationRepository.getConfirmedByProject(id));

  const graph = specGraphsByProject.get(projectId);
  if (!graph) {
    throw new Error(
      "Generate a decomposition graph before assembling the research spec " +
        "(decomposition.generate).",
    );
  }

  const [interpretation] = await Promise.all([getConfirmedInterpretation(projectId)]);

  const sections = assembleSections({
    interpretation,
    graphNodes: graph.nodes,
    sources: sourcesByProject.get(projectId) ?? [],
    gapProposal: gapProposalsByProject.get(projectId) ?? null,
    contributions: contributionsByProject.get(projectId) ?? [],
    claims: atomicClaimsByProject.get(projectId) ?? [],
    requirements: evidenceRequirementsByProject.get(projectId) ?? [],
    plans: experimentPlansByProject.get(projectId) ?? [],
    decisions: interpretationDecisionsByProject.get(projectId) ?? [],
    statusHistory: graph.statusHistory,
    findingResolutions: findingResolutionsByProject.get(projectId) ?? [],
  });

  const existing = researchSpecsByProject.get(projectId) ?? [];
  const spec: ResearchSpec = parseOrThrow(
    ResearchSpecSchema,
    {
      id: crypto.randomUUID(),
      projectId,
      version: existing.length + 1,
      sections,
      status: "DRAFT",
      finalizedAt: null,
      createdAt: new Date().toISOString(),
    },
    "ResearchSpec",
  );

  researchSpecsByProject.set(projectId, [...existing, spec]);
  return spec;
}

/** Latest version for a project, or null if none has been generated yet. */
export function getLatestResearchSpec(projectId: string): ResearchSpec | null {
  const versions = researchSpecsByProject.get(projectId) ?? [];
  return versions.at(-1) ?? null;
}

/** All versions for a project, oldest first — used by the Bước 10 version/diff view. */
export function listResearchSpecVersions(projectId: string): ResearchSpec[] {
  return researchSpecsByProject.get(projectId) ?? [];
}
