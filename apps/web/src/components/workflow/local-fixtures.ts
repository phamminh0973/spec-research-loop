import type { InterpretationRecord, SpecGraphView } from "@specloop/schemas";

export const LOCAL_PROJECT_ID = "00000000-0000-4000-8000-000000000001";

export const LOCAL_PROJECT = {
  id: LOCAL_PROJECT_ID,
  title: "Local Step 1 → Step 2 smoke project",
  domain: "Local development only",
};

export const LOCAL_INTERPRETATION_PROPOSAL: InterpretationRecord = {
  interpretationId: "00000000-0000-4000-8000-000000000011",
  projectId: LOCAL_PROJECT_ID,
  output: {
    simpleInterpretation:
      "Đây là dữ liệu fixture để kiểm tra vòng review. Nó mô phỏng cách hệ thống diễn giải một ý tưởng trước khi người dùng xác nhận.",
    technicalInterpretation:
      "Fixture này mô phỏng một interpretation record có output đơn giản, output kỹ thuật, assumptions, objectives và ambiguities theo contract AIT-01.",
    assumptions: [
      "Người dùng sẽ kiểm tra nội dung trước khi chuyển sang decomposition.",
    ],
    objectives: ["Kiểm tra trạng thái đề xuất và xác nhận trong UI."],
    ambiguities: ["Chưa có dữ liệu dự án production trong local fixture."],
  },
  status: "PROPOSED",
  promptId: "PT-01",
  promptVersion: "local-fixture",
  schemaVersion: "local-fixture",
  provider: "local-fixture",
  model: "local-fixture",
  retryCount: 0,
  createdAt: "2026-08-13T00:00:00Z",
  confirmedAt: null,
};

export const LOCAL_GRAPH: SpecGraphView = {
  projectId: LOCAL_PROJECT_ID,
  nodes: [
    {
      id: "00000000-0000-4000-8000-000000000101",
      projectId: LOCAL_PROJECT_ID,
      clientRef: "problem-1",
      type: "PROBLEM",
      title: "Problem candidate",
      content:
        "Fixture local mô phỏng một problem card cần được người dùng review.",
      status: "PROPOSED",
      sourceRefs: [],
      createdAt: "2026-08-13T00:00:00Z",
      updatedAt: "2026-08-13T00:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000102",
      projectId: LOCAL_PROJECT_ID,
      clientRef: "question-1",
      type: "RESEARCH_QUESTION",
      title: "Research question candidate",
      content:
        "Fixture local mô phỏng câu hỏi cần được làm rõ trước các bước evidence.",
      status: "PROPOSED",
      sourceRefs: [],
      createdAt: "2026-08-13T00:00:00Z",
      updatedAt: "2026-08-13T00:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000103",
      projectId: LOCAL_PROJECT_ID,
      clientRef: "gap-1",
      type: "GAP",
      title: "Research-gap candidate",
      content:
        "Fixture local mô phỏng một khoảng trống cần evidence và không phải tuyên bố novelty toàn cầu.",
      status: "NEEDS_REVIEW",
      sourceRefs: [],
      reason: "Chưa có corpus hoặc provenance trong local fixture.",
      createdAt: "2026-08-13T00:00:00Z",
      updatedAt: "2026-08-13T00:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000104",
      projectId: LOCAL_PROJECT_ID,
      clientRef: "evidence-1",
      type: "EVIDENCE",
      title: "Evidence requirement",
      content:
        "Mô tả evidence hoặc experiment cần có; fixture không khẳng định source hay kết quả nào.",
      status: "PROPOSED",
      sourceRefs: [],
      createdAt: "2026-08-13T00:00:00Z",
      updatedAt: "2026-08-13T00:00:00Z",
    },
  ],
  relations: [
    {
      id: "00000000-0000-4000-8000-000000000301",
      projectId: LOCAL_PROJECT_ID,
      sourceNodeId: "00000000-0000-4000-8000-000000000101",
      targetNodeId: "00000000-0000-4000-8000-000000000102",
      type: "ADDRESSES",
      createdAt: "2026-08-13T00:00:00Z",
    },
  ],
  warnings: [
    {
      code: "MISSING",
      targetClientRef: null,
      targetType: "CONTRIBUTION",
      reason: "Fixture chưa có contribution card.",
      suggestedAction:
        "Chỉ dùng fixture để kiểm tra trạng thái review; chưa chuyển dữ liệu này thành production evidence.",
    },
    {
      code: "UNSUPPORTED",
      targetClientRef: "gap-1",
      targetType: "GAP",
      reason: "Gap candidate chưa có sourceRefs hoặc corpus evidence.",
      suggestedAction:
        "Chờ literature/evidence contract và provenance trước khi đánh giá.",
    },
  ],
  statusHistory: [
    {
      id: "00000000-0000-4000-8000-000000000401",
      projectId: LOCAL_PROJECT_ID,
      nodeId: "00000000-0000-4000-8000-000000000101",
      fromStatus: null,
      toStatus: "PROPOSED",
      actor: "AI",
      authority: "AI",
      reason: "Fixture card generated for local Step 2 review.",
      occurredAt: "2026-08-13T00:00:00Z",
    },
  ],
};

export function cloneLocalInterpretation(
  status: InterpretationRecord["status"] = "PROPOSED"
): InterpretationRecord {
  return {
    ...LOCAL_INTERPRETATION_PROPOSAL,
    status,
    confirmedAt: status === "USER_CONFIRMED" ? "2026-08-13T00:00:00Z" : null,
  };
}

export function cloneLocalGraph(): SpecGraphView {
  return structuredClone(LOCAL_GRAPH);
}
