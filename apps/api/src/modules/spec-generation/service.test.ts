import type {
  AtomicClaim,
  Contribution,
  EvidenceRequirement,
  ExperimentPlan,
  GapProposalOutput,
  InterpretationDecision,
  InterpretationRecord,
  NodeStatusHistory,
  SourceDocument,
  SpecNode,
} from "@specloop/schemas";
import { describe, expect, it } from "vitest";
import {
  assembleSections,
  buildAblationPlanSection,
  buildClaimEvidenceMatrixSection,
  buildComputeBudgetSection,
  buildDecisionHistorySection,
  buildExpectedContributionsSection,
  buildOpenIssuesSection,
  buildProblemStatementSection,
  buildProposedApproachSection,
  buildRelatedWorkMatrixSection,
  buildResearchGapSection,
  buildResearchQuestionsSection,
  buildRisksAndLimitationsSection,
} from "./service.js";

const NODE_ID = "00000000-0000-4000-8000-000000000001";
const PROJECT_ID = "00000000-0000-4000-8000-0000000000aa";

function node(overrides: Partial<SpecNode> = {}): SpecNode {
  return {
    id: NODE_ID,
    projectId: PROJECT_ID,
    type: "PROBLEM",
    title: "Problem",
    content: "Prompt thủ công có thể không ổn định",
    status: "CONFIRMED",
    sourceRefs: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as SpecNode;
}

describe("spec-generation section builders", () => {
  it("marks the problem-statement section as placeholder when no interpretation or node exists", () => {
    const result = buildProblemStatementSection(null, []);
    expect(result.isPlaceholder).toBe(true);
    expect(result.content).toContain("chưa có dữ liệu");
  });

  it("combines confirmed interpretation with PROBLEM nodes when both exist", () => {
    const interpretation = {
      output: { simpleInterpretation: "Ý tưởng đã được diễn giải lại." },
    } as InterpretationRecord;
    const result = buildProblemStatementSection(interpretation, [node()]);
    expect(result.isPlaceholder).toBe(false);
    expect(result.content).toContain("Ý tưởng đã được diễn giải lại.");
    expect(result.content).toContain("Prompt thủ công");
  });

  it("renders research questions as a bullet list", () => {
    const result = buildResearchQuestionsSection([
      node({
        type: "RESEARCH_QUESTION",
        content: "Tối ưu nhiều vòng có giảm unsupported claims không?",
      }),
    ]);
    expect(result.isPlaceholder).toBe(false);
    expect(result.content).toContain("- [CONFIRMED]");
  });

  it("renders the related-work matrix only from selected sources", () => {
    const selected: SourceDocument = {
      id: "s1",
      projectId: PROJECT_ID,
      externalId: "arxiv:1",
      provenanceTier: "API",
      title: "OPRO",
      authors: [],
      published: null,
      url: null,
      doi: null,
      primaryCategory: null,
      abstract: "",
      analysis: {
        achievedOutcome: "LLM đề xuất prompt mới",
        methodology: "search + tự động",
        additionalResearchNeeded: "chưa tách claim",
      },
      selected: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const unselected = {
      ...selected,
      id: "s2",
      selected: false,
      title: "Unselected paper",
    };

    const result = buildRelatedWorkMatrixSection([selected, unselected]);
    expect(result.isPlaceholder).toBe(false);
    expect(result.content).toContain("OPRO");
    expect(result.content).not.toContain("Unselected paper");
  });

  it("marks the related-work matrix as placeholder when nothing is selected", () => {
    const result = buildRelatedWorkMatrixSection([]);
    expect(result.isPlaceholder).toBe(true);
  });

  it("includes the novelty-risk warning in the research-gap section", () => {
    const gapProposal: GapProposalOutput = {
      candidates: [
        {
          knownCapability: "OPRO tối ưu prompt bằng điểm tổng",
          limitation: "Chưa tách claim-level feedback",
          importance: "Ảnh hưởng độ chính xác",
          testableHypothesis: "Feedback claim-level giảm unsupported claim",
          evidenceRefs: [],
          nearestWorkIds: [],
          noveltyRisk: "Có thể trùng với TextGrad",
          scope: "Trích xuất thông tin từ paper khoa học",
        },
      ],
      warning:
        "Đây là gap ứng viên do AI đề xuất, cần xác nhận thêm bằng tài liệu trước khi chốt.",
    };
    const result = buildResearchGapSection([], gapProposal);
    expect(result.isPlaceholder).toBe(false);
    expect(result.content).toContain("Warning:");
    expect(result.content).toContain("cần xác nhận thêm");
  });

  it("joins contribution text into a single proposed-approach paragraph", () => {
    const contributions: Contribution[] = [
      {
        id: "c1",
        projectId: PROJECT_ID,
        text: "Framework tối ưu prompt qua nhiều vòng.",
        claimIds: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      } as Contribution,
    ];
    const result = buildProposedApproachSection(contributions);
    expect(result.content).toBe("Framework tối ưu prompt qua nhiều vòng.");
  });

  it("shows linked-claim counts in the expected-contributions section", () => {
    const contributions: Contribution[] = [
      {
        id: "c1",
        projectId: PROJECT_ID,
        text: "Verifier claim-evidence.",
        claimIds: ["claim-1", "claim-2"],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      } as Contribution,
    ];
    const result = buildExpectedContributionsSection(contributions);
    expect(result.content).toContain("2 claim liên kết");
  });

  it("flags a claim with no evidence requirement explicitly rather than omitting it", () => {
    const claims: AtomicClaim[] = [
      {
        id: "claim-1",
        projectId: PROJECT_ID,
        type: "EMPIRICAL",
        text: "Phương pháp giảm unsupported claims.",
        scope: "paper khoa học",
        baseline: "self-refine",
        datasetDomain: "arXiv cs.AI",
        metric: "unsupported claim rate",
        expectedDirection: "giảm",
        falsificationCondition: "không cải thiện ổn định",
        evidenceRefs: [],
        experimentRefs: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      } as AtomicClaim,
    ];
    const result = buildClaimEvidenceMatrixSection(claims, []);
    expect(result.isPlaceholder).toBe(false);
    expect(result.content).toContain("chưa có evidence requirement");
  });

  it("renders metric, operator/threshold and success criterion for a claim with requirement", () => {
    const claims: AtomicClaim[] = [
      {
        id: "claim-1",
        projectId: PROJECT_ID,
        type: "EMPIRICAL",
        text: "Phương pháp giảm unsupported claims.",
        scope: "paper khoa học",
        baseline: "self-refine",
        datasetDomain: "arXiv cs.AI",
        metric: "unsupported claim rate",
        expectedDirection: "giảm",
        falsificationCondition: "không cải thiện ổn định",
        evidenceRefs: [],
        experimentRefs: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      } as AtomicClaim,
    ];
    const requirements: EvidenceRequirement[] = [
      {
        id: "req-1",
        projectId: PROJECT_ID,
        claimId: "claim-1",
        metric: "unsupported claim rate",
        operator: "LTE",
        threshold:
          "Not (không cải thiện ổn định) — satisfies giảm on unsupported claim rate",
        successCriterion:
          'Claim "Phương pháp giảm unsupported claims." is verified if unsupported claim rate measured on arXiv cs.AI in scope "paper khoa học" vs baseline self-refine shows giảm and does not satisfy falsification condition: không cải thiện ổn định.',
        falsificationCriterion: "không cải thiện ổn định",
        measurementMethod:
          "Measure unsupported claim rate on arXiv cs.AI against baseline self-refine within scope paper khoa học.",
        requiredObservations: ["unsupported claim rate"],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      } as EvidenceRequirement,
    ];

    const result = buildClaimEvidenceMatrixSection(claims, requirements);
    expect(result.content).toContain("unsupported claim rate");
    expect(result.content).toContain("LTE");
    expect(result.content).toContain("không cải thiện ổn định");
  });

  it("lists every ablation across all experiment plans", () => {
    const plans: ExperimentPlan[] = [
      {
        id: "p1",
        projectId: PROJECT_ID,
        tier: "PROPOSED",
        baselines: [],
        metrics: [],
        protocol: [],
        controls: [],
        ablations: ["Loại bỏ claim decomposition", "Loại bỏ evidence verifier"],
        generalizationProposals: [],
        assumptions: [],
        estimates: [],
        claimIds: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      } as ExperimentPlan,
    ];
    const result = buildAblationPlanSection(plans);
    expect(result.content).toContain("Loại bỏ claim decomposition");
    expect(result.content).toContain("Loại bỏ evidence verifier");
  });

  it("labels each compute-budget input with its assumed/measured basis", () => {
    const plans: ExperimentPlan[] = [
      {
        id: "p1",
        projectId: PROJECT_ID,
        tier: "PROPOSED",
        baselines: [],
        metrics: [],
        protocol: [],
        controls: [],
        ablations: [],
        generalizationProposals: [],
        assumptions: [],
        estimates: [
          {
            label: "VRAM",
            formula: "model_size * bytes_per_param",
            inputs: [{ name: "model_size", value: "7B", basis: "assumed" }],
            result: "~20GB",
          },
        ],
        claimIds: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      } as ExperimentPlan,
    ];
    const result = buildComputeBudgetSection(plans);
    expect(result.content).toContain("[assumed]");
    expect(result.content).toContain("~20GB");
  });

  it("includes the gap proposal's novelty-risk warning in risks and limitations", () => {
    const gapProposal: GapProposalOutput = {
      candidates: [],
      warning: "Cần thêm domain khác để khẳng định khả năng tổng quát.",
    };
    const result = buildRisksAndLimitationsSection([], gapProposal);
    expect(result.content).toContain("Cần thêm domain khác");
  });

  it("renders open issues from OPEN_QUESTION nodes", () => {
    const result = buildOpenIssuesSection([
      node({
        type: "OPEN_QUESTION",
        content: "Tối ưu một prompt hay cả pipeline?",
      }),
    ]);
    expect(result.isPlaceholder).toBe(false);
    expect(result.content).toContain("Tối ưu một prompt hay cả pipeline?");
  });

  it("merges Step-1 decisions and node status changes into decision history", () => {
    const decisions: InterpretationDecision[] = [
      {
        id: "d1",
        projectId: PROJECT_ID,
        interpretationId: "i1",
        action: "CONFIRM",
        content: null,
        actorId: "user-1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const history: NodeStatusHistory[] = [
      {
        id: "h1",
        projectId: PROJECT_ID,
        nodeId: NODE_ID,
        fromStatus: "PROPOSED",
        toStatus: "CONFIRMED",
        actor: "USER",
        authority: "USER",
        reason: "User confirmed via UI",
        occurredAt: "2026-01-02T00:00:00.000Z",
      },
    ];
    const result = buildDecisionHistorySection(decisions, history);
    expect(result.content).toContain("CONFIRM");
    expect(result.content).toContain("PROPOSED → CONFIRMED");
  });

  it("assembles all 14 sections in the canonical order", () => {
    const sections = assembleSections({
      interpretation: null,
      graphNodes: [],
      sources: [],
      gapProposal: null,
      contributions: [],
      claims: [],
      requirements: [],
      plans: [],
      decisions: [],
      statusHistory: [],
    });

    expect(sections).toHaveLength(14);
    expect(sections[0]?.id).toBe("PROBLEM_STATEMENT");
    expect(sections.at(-1)?.id).toBe("DECISION_HISTORY");
    // With no upstream data at all, every section must say so explicitly
    // rather than silently rendering empty/misleading content.
    expect(sections.every((s) => s.isPlaceholder)).toBe(true);
  });
});
