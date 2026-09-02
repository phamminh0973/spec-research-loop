/**
 * Judge panel service (AIT-09, Bước 9 in the assignment).
 *
 * Pure business logic for running the five independent Judges over a
 * project's current spec context and computing a deterministic consensus.
 * Mirrors the research-design service pattern: read from the in-memory
 * project-store, call the LLM via `structuredCall`, validate against the
 * shared Zod schema, persist, return. Routers stay thin.
 *
 * Independence guarantee: each Judge gets its own `structuredCall` with a
 * context built ONLY from persisted project data — never from another
 * Judge's summary or findings. The five calls run in parallel
 * (`Promise.all`), which makes it structurally impossible for one Judge's
 * wording to leak into another's prompt. Aggregation (`computeConsensus`)
 * is a pure, deterministic function over the five already-produced reports,
 * never an LLM call — consensus is arithmetic, not another opinion.
 */

import {
  FindingSchema,
  JudgeCallOutputSchema,
  JudgePanelResultSchema,
  JudgeReportSchema,
  type Consensus,
  type Finding,
  type FindingSeverity,
  type JudgeName,
  type JudgePanelResult,
  type JudgeReport,
  ALL_JUDGE_NAMES,
} from "@specloop/schemas";
import {
  CONFERENCE_READINESS_JUDGE_SYSTEM_PROMPT,
  CONTRIBUTION_JUDGE_SYSTEM_PROMPT,
  EVIDENCE_JUDGE_SYSTEM_PROMPT,
  EXPERIMENT_JUDGE_SYSTEM_PROMPT,
  GAP_JUDGE_SYSTEM_PROMPT,
} from "./prompt.js";
import {
  structuredCall,
  type UntrustedContent,
} from "../../llm/structured-call.js";
import {
  atomicClaimsByProject,
  contributionsByProject,
  evidenceRequirementsByProject,
  experimentPlansByProject,
  gapProposalsByProject,
  judgePanelsByProject,
  parseOrThrow,
  sourcesByProject,
  specGraphsByProject,
} from "../../store/project-store.js";

// ---------------------------------------------------------------------------
// Context builders — one per Judge, scoped to only what that Judge needs.
// ---------------------------------------------------------------------------

function nodesByType(projectId: string, type: string) {
  const graph = specGraphsByProject.get(projectId);
  return (graph?.nodes ?? []).filter((n) => n.type === type);
}

function renderNodes(
  nodes: ReturnType<typeof nodesByType>,
  emptyLabel: string,
): string {
  if (nodes.length === 0) return emptyLabel;
  return nodes
    .map((n) => `- [${n.status}] ${n.title}: ${n.content}`)
    .join("\n");
}

/** Judge 1 — Gap: problem/research-question/gap nodes, gap proposal, selected corpus. */
export function buildGapJudgeContext(projectId: string): UntrustedContent[] {
  const problems = nodesByType(projectId, "PROBLEM");
  const questions = nodesByType(projectId, "RESEARCH_QUESTION");
  const gapNodes = nodesByType(projectId, "GAP");
  const proposal = gapProposalsByProject.get(projectId);
  const corpus = (sourcesByProject.get(projectId) ?? []).filter((s) => s.selected);

  const blocks: UntrustedContent[] = [
    {
      label: "Problem and research question nodes",
      text:
        `Problem:\n${renderNodes(problems, "(none)")}\n\n` +
        `Research questions:\n${renderNodes(questions, "(none)")}`,
    },
    {
      label: "Gap nodes in the decomposition graph",
      text: renderNodes(gapNodes, "(no GAP node yet)"),
    },
  ];

  if (proposal) {
    blocks.push({
      label: "Most recent gap proposal (AI-generated, user has not necessarily confirmed)",
      text: proposal.candidates
        .map(
          (c, i) =>
            `Candidate ${i}:\n` +
            `  known_capability: ${c.knownCapability}\n` +
            `  limitation: ${c.limitation}\n` +
            `  importance: ${c.importance}\n` +
            `  testable_hypothesis: ${c.testableHypothesis}\n` +
            `  novelty_risk: ${c.noveltyRisk}\n` +
            `  scope: ${c.scope}`,
        )
        .join("\n\n") || "(no candidates)",
    });
  }

  blocks.push({
    label: "Selected literature corpus (titles + abstracts)",
    text:
      corpus.length === 0
        ? "(no source selected into the corpus)"
        : corpus.map((s) => `- ${s.title}\n  ${s.abstract}`).join("\n"),
  });

  return blocks;
}

/** Judge 2 — Contribution: contribution nodes/records, atomic claims, chosen gap. */
export function buildContributionJudgeContext(projectId: string): UntrustedContent[] {
  const contributionNodes = nodesByType(projectId, "CONTRIBUTION");
  const contributions = contributionsByProject.get(projectId) ?? [];
  const claims = atomicClaimsByProject.get(projectId) ?? [];

  return [
    {
      label: "Contribution nodes in the decomposition graph",
      text: renderNodes(contributionNodes, "(no CONTRIBUTION node yet)"),
    },
    {
      label: "Generated contributions",
      text:
        contributions.length === 0
          ? "(none generated yet)"
          : contributions
              .map((c) => `- ${c.text} (linked claims: ${c.claimIds.length})`)
              .join("\n"),
    },
    {
      label: "Atomic claims (falsifiability + scope)",
      text:
        claims.length === 0
          ? "(none generated yet)"
          : claims
              .map(
                (c) =>
                  `- [${c.type}] ${c.text}\n` +
                  `  scope: ${c.scope}\n` +
                  `  falsifies if: ${c.falsificationCondition}`,
              )
              .join("\n"),
    },
  ];
}

/** Judge 3 — Experiment: atomic claims + experiment plans (baselines/metrics/ablations/estimates). */
export function buildExperimentJudgeContext(projectId: string): UntrustedContent[] {
  const claims = atomicClaimsByProject.get(projectId) ?? [];
  const plans = experimentPlansByProject.get(projectId) ?? [];

  return [
    {
      label: "Atomic claims requiring experimental support",
      text:
        claims.length === 0
          ? "(none generated yet)"
          : claims
              .map((c) => `- Claim ${c.id} [${c.type}]: ${c.text}\n  scope: ${c.scope}\n  baseline: ${c.baseline}\n  metric: ${c.metric}`)
              .join("\n"),
    },
    {
      label: "Experiment plans",
      text:
        plans.length === 0
          ? "(no experiment plan generated yet)"
          : plans
              .map(
                (p) =>
                  `Plan ${p.id} [tier ${p.tier}] covers claims: ${p.claimIds.join(", ") || "(none)"}\n` +
                  `  baselines: ${p.baselines.join("; ") || "(none)"}\n` +
                  `  metrics: ${p.metrics.join("; ") || "(none)"}\n` +
                  `  controls: ${p.controls.join("; ") || "(none)"}\n` +
                  `  ablations: ${p.ablations.join("; ") || "(none)"}\n` +
                  `  generalization_proposals: ${p.generalizationProposals.join("; ") || "(none)"}\n` +
                  `  estimates: ${p.estimates
                    .map((e) => `${e.label}=${e.result} (${e.inputs.map((i) => `${i.name}:${i.value}[${i.basis}]`).join(", ")})`)
                    .join("; ") || "(none)"}`,
              )
              .join("\n\n"),
    },
  ];
}

/** Judge 4 — Evidence: does each claim have a verifiable metric threshold? */
export function buildEvidenceJudgeContext(projectId: string): UntrustedContent[] {
  const claims = atomicClaimsByProject.get(projectId) ?? [];
  const requirements = evidenceRequirementsByProject.get(projectId) ?? [];
  const reqByClaim = new Map(requirements.map((r) => [r.claimId, r]));
  const claimNodes = nodesByType(projectId, "CLAIM");

  return [
    {
      label: "Claim nodes",
      text: renderNodes(claimNodes, "(no CLAIM node yet)"),
    },
    {
      label: "Atomic claims with their EvidenceRequirements (what the metric value must satisfy to be verified)",
      text:
        claims.length === 0
          ? "(no atomic claims generated yet)"
          : claims
              .map((claim) => {
                const req = reqByClaim.get(claim.id);
                if (!req) {
                  return `- claim ${claim.id} [${claim.type}]: ${claim.text}\n  metric=${claim.metric} expectedDirection=${claim.expectedDirection} falsifiesIf=${claim.falsificationCondition}\n  EvidenceRequirement: (none) — claim has no verifiable criterion`;
                }
                return (
                  `- claim ${claim.id} [${claim.type}]: ${claim.text}\n` +
                  `  claim metric=${claim.metric} expectedDirection=${claim.expectedDirection} baseline=${claim.baseline} datasetDomain=${claim.datasetDomain} scope=${claim.scope} falsifiesIf=${claim.falsificationCondition}\n` +
                  `  EvidenceRequirement: metric=${req.metric} operator=${req.operator} threshold=${req.threshold}\n` +
                  `    successCriterion=${req.successCriterion}\n` +
                  `    falsificationCriterion=${req.falsificationCriterion}\n` +
                  `    measurementMethod=${req.measurementMethod ?? "(none)"} requiredObservations=${req.requiredObservations.join(", ") || "(none)"}`
                );
              })
              .join("\n\n"),
    },
  ];
}

/** Judge 5 — Conference Readiness: compact holistic summary across the whole spec. */
export function buildConferenceReadinessJudgeContext(projectId: string): UntrustedContent[] {
  const problems = nodesByType(projectId, "PROBLEM");
  const gapNodes = nodesByType(projectId, "GAP");
  const contributions = contributionsByProject.get(projectId) ?? [];
  const claims = atomicClaimsByProject.get(projectId) ?? [];
  const plans = experimentPlansByProject.get(projectId) ?? [];
  const requirements = evidenceRequirementsByProject.get(projectId) ?? [];

  return [
    {
      label: "Holistic spec summary",
      text:
        `Problem:\n${renderNodes(problems, "(none)")}\n\n` +
        `Gap:\n${renderNodes(gapNodes, "(none)")}\n\n` +
        `Contributions (${contributions.length}):\n${contributions.map((c) => `- ${c.text}`).join("\n") || "(none)"}\n\n` +
        `Claims (${claims.length}):\n${claims.map((c) => `- [${c.type}] ${c.text}`).join("\n") || "(none)"}\n\n` +
        `Experiment plans: ${plans.length}\n` +
        `EvidenceRequirements: ${requirements.length} total for ${claims.length} claims (${requirements.length === 0 ? "none have a verifiable criterion yet" : `${requirements.length} claims have a metric/threshold criterion`}).`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Per-Judge dispatch and panel execution
// ---------------------------------------------------------------------------

const JUDGE_DISPATCH: Record<
  JudgeName,
  { systemPrompt: string; buildContext: (projectId: string) => UntrustedContent[] }
> = {
  GAP: { systemPrompt: GAP_JUDGE_SYSTEM_PROMPT, buildContext: buildGapJudgeContext },
  CONTRIBUTION: {
    systemPrompt: CONTRIBUTION_JUDGE_SYSTEM_PROMPT,
    buildContext: buildContributionJudgeContext,
  },
  EXPERIMENT: {
    systemPrompt: EXPERIMENT_JUDGE_SYSTEM_PROMPT,
    buildContext: buildExperimentJudgeContext,
  },
  EVIDENCE: {
    systemPrompt: EVIDENCE_JUDGE_SYSTEM_PROMPT,
    buildContext: buildEvidenceJudgeContext,
  },
  CONFERENCE_READINESS: {
    systemPrompt: CONFERENCE_READINESS_JUDGE_SYSTEM_PROMPT,
    buildContext: buildConferenceReadinessJudgeContext,
  },
};

/** Run exactly one Judge, independently, over the project's current context. */
export async function runJudge(params: {
  judge: JudgeName;
  projectId: string;
  client: any;
  model: string;
}): Promise<JudgeReport> {
  const { judge, projectId, client, model } = params;
  const dispatch = JUDGE_DISPATCH[judge];

  const output = await structuredCall({
    client,
    model,
    systemPrompt: dispatch.systemPrompt,
    userPrompt:
      "Evaluate the context below strictly within your assigned focus area. " +
      "Return an empty findings array if you find no real issue — never invent one.",
    untrusted: dispatch.buildContext(projectId),
    outputSchema: JudgeCallOutputSchema,
    schemaName: `judge_${judge.toLowerCase()}_output`,
  });

  const findings: Finding[] = output.findings.map((f) =>
    parseOrThrow(
      FindingSchema,
      { ...f, id: crypto.randomUUID(), judge },
      "Finding",
    ),
  );

  return parseOrThrow(
    JudgeReportSchema,
    { judge, summary: output.summary, findings },
    "JudgeReport",
  );
}

/**
 * Deterministic, non-LLM aggregation across five already-produced reports.
 * Exported separately so it can be unit-tested without a model call.
 */
export function computeConsensus(reports: JudgeReport[]): Consensus {
  const severityCounts = { CRITICAL: 0, MAJOR: 0, MINOR: 0 };
  const sectionAgreement = new Map<string, { label: string; judges: Set<JudgeName> }>();

  for (const report of reports) {
    for (const finding of report.findings) {
      severityCounts[finding.severity] += 1;

      const key = finding.targetSection.trim().toLowerCase();
      const entry = sectionAgreement.get(key) ?? {
        label: finding.targetSection.trim(),
        judges: new Set<JudgeName>(),
      };
      entry.judges.add(report.judge);
      sectionAgreement.set(key, entry);
    }
  }

  const agreedSections = [...sectionAgreement.values()]
    .filter((entry) => entry.judges.size >= 2)
    .map((entry) => entry.label);

  const overallSeverity: FindingSeverity | null =
    severityCounts.CRITICAL > 0
      ? "CRITICAL"
      : severityCounts.MAJOR > 0
        ? "MAJOR"
        : severityCounts.MINOR > 0
          ? "MINOR"
          : null;

  return {
    severityCounts,
    overallSeverity,
    agreedSections,
    readyToFinalize: severityCounts.CRITICAL === 0 && severityCounts.MAJOR === 0,
  };
}

/**
 * Run all five Judges independently (in parallel) and persist the panel
 * result. Requires a decomposition graph to exist — there is nothing
 * meaningful to judge before Bước 2 has run at least once.
 */
export async function runJudgePanel(params: {
  projectId: string;
  client: any;
  model: string;
}): Promise<JudgePanelResult> {
  const { projectId, client, model } = params;

  if (!specGraphsByProject.get(projectId)) {
    throw new Error(
      "Generate a decomposition graph before running the Judge panel " +
        "(decomposition.generate).",
    );
  }

  const judges = await Promise.all(
    ALL_JUDGE_NAMES.map((judge) => runJudge({ judge, projectId, client, model })),
  );

  const consensus = computeConsensus(judges);
  const now = new Date().toISOString();

  const result: JudgePanelResult = parseOrThrow(
    JudgePanelResultSchema,
    {
      id: crypto.randomUUID(),
      projectId,
      judges,
      consensus,
      createdAt: now,
    },
    "JudgePanelResult",
  );

  judgePanelsByProject.set(projectId, result);
  return result;
}
