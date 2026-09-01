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
  type ClaimEvidenceLink,
  type Contribution,
  type EvidenceSpan,
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
import { interpretationRepository } from "../interpretation/index.js";
import {
  atomicClaimsByProject,
  claimEvidenceLinksByProject,
  contributionsByProject,
  evidenceSpansByProject,
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

function bulletList(lines: string[], emptyText: string): string {
  return lines.length === 0 ? emptyText : lines.map((l) => `- ${l}`).join("\n");
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
  const parts: string[] = [];
  if (interpretation) {
    parts.push(interpretation.output.simpleInterpretation);
  }
  if (problemNodes.length > 0) {
    parts.push(
      "Problem nodes (Bước 2):\n" +
        bulletList(problemNodes.map((n) => `[${n.status}] ${n.title}: ${n.content}`), ""),
    );
  }
  const isPlaceholder = parts.length === 0;
  return section(
    "PROBLEM_STATEMENT",
    "1. Problem statement",
    isPlaceholder
      ? `${PLACEHOLDER_PREFIX} — chưa có interpretation đã xác nhận hoặc PROBLEM node.`
      : parts.join("\n\n"),
    isPlaceholder,
  );
}

/** 2. Research questions — RESEARCH_QUESTION nodes. */
export function buildResearchQuestionsSection(questionNodes: SpecNode[]): SpecSection {
  const isPlaceholder = questionNodes.length === 0;
  return section(
    "RESEARCH_QUESTIONS",
    "2. Research questions",
    isPlaceholder
      ? `${PLACEHOLDER_PREFIX} — chưa có RESEARCH_QUESTION node nào.`
      : bulletList(questionNodes.map((n) => `[${n.status}] ${n.content}`), ""),
    isPlaceholder,
  );
}

/** 3. Related-work matrix — selected sources with LLM-proposed analysis (user-reviewed). */
export function buildRelatedWorkMatrixSection(sources: SourceDocument[]): SpecSection {
  const selected = sources.filter((s) => s.selected);
  const isPlaceholder = selected.length === 0;
  const escapeCell = (value: string): string =>
    value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br />").trim();

  const rows = selected.map((s) => {
    const analysis = s.analysis;
    return `| ${escapeCell(s.title)} | ${escapeCell(analysis?.achievedOutcome ?? "—")} | ${escapeCell(analysis?.methodology ?? "—")} | ${escapeCell(analysis?.additionalResearchNeeded ?? "—")} |`;
  });
  const content = isPlaceholder
    ? `${PLACEHOLDER_PREFIX} — chưa có nguồn nào được chọn vào corpus.`
    : [
        "| Nghiên cứu | Đã làm gì | Phương pháp | Điểm cần nghiên cứu thêm |",
        "| --- | --- | --- | --- |",
        ...rows,
      ].join("\n");
  return section("RELATED_WORK_MATRIX", "3. Related-work matrix", content, isPlaceholder);
}

/** 4. Research gap — GAP nodes + most recent gap proposal (always carries novelty-risk warning). */
export function buildResearchGapSection(
  gapNodes: SpecNode[],
  gapProposal: GapProposalOutput | null,
): SpecSection {
  const parts: string[] = [];
  if (gapNodes.length > 0) {
    parts.push(
      "Gap nodes (Bước 2):\n" + bulletList(gapNodes.map((n) => `[${n.status}] ${n.content}`), ""),
    );
  }
  if (gapProposal) {
    parts.push(
      "Gap candidates (AIT-06):\n" +
        gapProposal.candidates
          .map(
            (c, i) =>
              `${i + 1}. ${c.limitation} (importance: ${c.importance})\n   novelty risk: ${c.noveltyRisk}`,
          )
        `\n\nWarning: ${gapProposal.warning}`,
    );
  }
  const isPlaceholder = parts.length === 0;
  return section(
    "RESEARCH_GAP",
    "4. Research gap",
    isPlaceholder ? `${PLACEHOLDER_PREFIX} — chưa có GAP node hoặc gap proposal.` : parts.join("\n\n"),
    isPlaceholder,
  );
}

/** 5. Proposed approach — synthesized from contribution text (no new content, only formatting). */
export function buildProposedApproachSection(contributions: Contribution[]): SpecSection {
  const isPlaceholder = contributions.length === 0;
  return section(
    "PROPOSED_APPROACH",
    "5. Proposed approach",
    isPlaceholder
      ? `${PLACEHOLDER_PREFIX} — chưa có contribution nào được tạo.`
      : contributions.map((c) => c.text).join(" "),
    isPlaceholder,
  );
}

/** 6. Expected contributions — contribution records with linked claim counts. */
export function buildExpectedContributionsSection(contributions: Contribution[]): SpecSection {
  const isPlaceholder = contributions.length === 0;
  return section(
    "EXPECTED_CONTRIBUTIONS",
    "6. Expected contributions",
    isPlaceholder
      ? `${PLACEHOLDER_PREFIX} — chưa có contribution nào được tạo.`
      : bulletList(
          contributions.map((c) => `${c.text} (${c.claimIds.length} claim liên kết)`),
          "",
        ),
    isPlaceholder,
  );
}

/** 7. Claim–evidence matrix — every claim's linked evidence, integrity status and review verdict. */
export function buildClaimEvidenceMatrixSection(
  claims: AtomicClaim[],
  links: ClaimEvidenceLink[],
  spans: EvidenceSpan[],
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
  const spanById = new Map(spans.map((s) => [s.id, s]));
  const rows = claims.map((claim) => {
    const claimLinks = links.filter((l) => l.claimNodeId === claim.id);
    if (claimLinks.length === 0) {
      return `| ${claim.text} | (không có evidence) | — | — |`;
    }
    return claimLinks
      .map((link) => {
        const span = spanById.get(link.evidenceSpanId);
        const evidenceText = span ? span.exactText : "(evidence span not found)";
        const verdict = link.review?.verdict ?? "(chưa review)";
        return `| ${claim.text} | ${evidenceText} | ${link.integrityStatus} | ${verdict} |`;
      })
      .join("\n");
  });
  const content = [
    "| Claim | Evidence | Integrity status | Review verdict |",
    "| --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
  return section("CLAIM_EVIDENCE_MATRIX", "7. Claim–evidence matrix", content, false);
}

/** 8. Experimental protocol — protocol steps + controls across all plans. */
export function buildExperimentalProtocolSection(plans: ExperimentPlan[]): SpecSection {
  const isPlaceholder = plans.length === 0;
  return section(
    "EXPERIMENTAL_PROTOCOL",
    "8. Experimental protocol",
    isPlaceholder
      ? `${PLACEHOLDER_PREFIX} — chưa có experiment plan nào được tạo.`
      : plans
          .map(
            (p) =>
              `Plan [tier ${p.tier}]:\n` +
              `Protocol:\n${bulletList(p.protocol, "  (none)")}\n` +
              `Controls:\n${bulletList(p.controls, "  (none)")}`,
          )
          .join("\n\n"),
    isPlaceholder,
  );
}

/** 9. Baselines and metrics. */
export function buildBaselinesAndMetricsSection(plans: ExperimentPlan[]): SpecSection {
  const isPlaceholder = plans.length === 0;
  return section(
    "BASELINES_AND_METRICS",
    "9. Baselines and metrics",
    isPlaceholder
      ? `${PLACEHOLDER_PREFIX} — chưa có experiment plan nào được tạo.`
      : plans
          .map(
            (p) =>
              `Baselines:\n${bulletList(p.baselines, "  (none)")}\n` +
              `Metrics:\n${bulletList(p.metrics, "  (none)")}`,
          )
          .join("\n\n"),
    isPlaceholder,
  );
}

/** 10. Ablation plan — at least one is required per AI design §8. */
export function buildAblationPlanSection(plans: ExperimentPlan[]): SpecSection {
  const ablations = plans.flatMap((p) => p.ablations);
  const isPlaceholder = ablations.length === 0;
  return section(
    "ABLATION_PLAN",
    "10. Ablation plan",
    isPlaceholder
      ? `${PLACEHOLDER_PREFIX} — chưa có ablation nào được đề xuất.`
      : bulletList(ablations, ""),
    isPlaceholder,
  );
}

/** 11. Compute budget — resource estimates, each input labeled assumed/measured. */
export function buildComputeBudgetSection(plans: ExperimentPlan[]): SpecSection {
  const estimates = plans.flatMap((p) => p.estimates);
  const isPlaceholder = estimates.length === 0;
  return section(
    "COMPUTE_BUDGET",
    "11. Compute budget",
    isPlaceholder
      ? `${PLACEHOLDER_PREFIX} — chưa có resource estimate nào.`
      : estimates
          .map(
            (e) =>
              `${e.label}: ${e.result} (formula: ${e.formula}; inputs: ${e.inputs
                .map((i) => `${i.name}=${i.value}[${i.basis}]`)
                .join(", ") || "none"})`,
          )
          .join("\n"),
    isPlaceholder,
  );
}

/** 12. Risks and limitations — RISK nodes + every gap candidate's novelty-risk warning. */
export function buildRisksAndLimitationsSection(
  riskNodes: SpecNode[],
  gapProposal: GapProposalOutput | null,
): SpecSection {
  const parts: string[] = [];
  if (riskNodes.length > 0) {
    parts.push(bulletList(riskNodes.map((n) => `[${n.status}] ${n.content}`), ""));
  }
  if (gapProposal) {
    parts.push(`Novelty-risk warning (BR-04): ${gapProposal.warning}`);
  }
  const isPlaceholder = parts.length === 0;
  return section(
    "RISKS_AND_LIMITATIONS",
    "12. Risks and limitations",
    isPlaceholder ? `${PLACEHOLDER_PREFIX} — chưa có RISK node hoặc gap proposal.` : parts.join("\n\n"),
    isPlaceholder,
  );
}

/** 13. Open issues — OPEN_QUESTION nodes. */
export function buildOpenIssuesSection(openQuestionNodes: SpecNode[]): SpecSection {
  const isPlaceholder = openQuestionNodes.length === 0;
  return section(
    "OPEN_ISSUES",
    "13. Open issues",
    isPlaceholder
      ? `${PLACEHOLDER_PREFIX} — chưa có OPEN_QUESTION node nào.`
      : bulletList(openQuestionNodes.map((n) => `[${n.status}] ${n.content}`), ""),
    isPlaceholder,
  );
}

/** 14. Decision history — Step-1 confirm/edit/regenerate/other decisions + node status changes + Bước 10 finding resolutions. */
export function buildDecisionHistorySection(
  decisions: InterpretationDecision[],
  statusHistory: NodeStatusHistory[],
  findingResolutions: FindingResolution[] = [],
): SpecSection {
  const parts: string[] = [];
  if (decisions.length > 0) {
    parts.push(
      "Bước 1 decisions:\n" +
        bulletList(
          decisions.map(
            (d) => `[${d.createdAt}] ${d.action}${d.content ? `: ${d.content}` : ""}`,
          ),
          "",
        ),
    );
  }
  if (statusHistory.length > 0) {
    parts.push(
      "Node status changes:\n" +
        bulletList(
          statusHistory.map(
            (h) =>
              `[${h.occurredAt}] ${h.nodeId} ${h.fromStatus ?? "(new)"} → ${h.toStatus} (${h.actor}: ${h.reason})`,
          ),
          "",
        ),
    );
  }
  if (findingResolutions.length > 0) {
    parts.push(
      "Bước 10 finding resolutions:\n" +
        bulletList(
          findingResolutions.map(
            (r) =>
              `[${r.createdAt}] ${r.judge} / "${r.targetSection}" → ${r.resolution}: ${r.note}`,
          ),
          "",
        ),
    );
  }
  const isPlaceholder = parts.length === 0;
  return section(
    "DECISION_HISTORY",
    "14. Decision history",
    isPlaceholder ? `${PLACEHOLDER_PREFIX} — chưa có quyết định nào được ghi nhận.` : parts.join("\n\n"),
    isPlaceholder,
  );
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
  links: ClaimEvidenceLink[];
  spans: EvidenceSpan[];
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
    CLAIM_EVIDENCE_MATRIX: buildClaimEvidenceMatrixSection(data.claims, data.links, data.spans),
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
    links: claimEvidenceLinksByProject.get(projectId) ?? [],
    spans: evidenceSpansByProject.get(projectId) ?? [],
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
