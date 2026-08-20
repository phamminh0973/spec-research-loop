import type { SpecGraphView } from "@specloop/schemas";

import { LOCAL_PROJECT_ID } from "../shared/local-fixtures";

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
      status: "USER_CONFIRMED",
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
    {
      id: "00000000-0000-4000-8000-000000000105",
      projectId: LOCAL_PROJECT_ID,
      clientRef: "contribution-1",
      type: "CONTRIBUTION",
      title: "Contribution candidate",
      content:
        "Fixture local mô phỏng contribution candidate; người dùng vẫn cần review phạm vi.",
      status: "NEEDS_REVIEW",
      sourceRefs: [],
      reason: "Contribution chưa được xác nhận bởi người dùng.",
      createdAt: "2026-08-13T00:00:00Z",
      updatedAt: "2026-08-13T00:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000106",
      projectId: LOCAL_PROJECT_ID,
      clientRef: "claim-1",
      type: "CLAIM",
      title: "Claim candidate",
      content:
        "Fixture local mô phỏng claim cần evidence hoặc planned experiment; chưa phải kết quả.",
      status: "UNSUPPORTED",
      sourceRefs: [],
      reason: "Chưa có evidence đã xác minh hoặc planned experiment.",
      createdAt: "2026-08-13T00:00:00Z",
      updatedAt: "2026-08-13T00:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000107",
      projectId: LOCAL_PROJECT_ID,
      clientRef: "constraint-1",
      type: "CONSTRAINT",
      title: "Local execution constraint",
      content:
        "Fixture local mô phỏng giới hạn reproducible trong môi trường phát triển.",
      status: "PROPOSED",
      sourceRefs: [],
      createdAt: "2026-08-13T00:00:00Z",
      updatedAt: "2026-08-13T00:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000108",
      projectId: LOCAL_PROJECT_ID,
      clientRef: "risk-1",
      type: "RISK",
      title: "Evidence availability risk",
      content:
        "Fixture local mô phỏng rủi ro evidence không đủ; không phải kết luận về literature.",
      status: "PROPOSED",
      sourceRefs: [],
      createdAt: "2026-08-13T00:00:00Z",
      updatedAt: "2026-08-13T00:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000109",
      projectId: LOCAL_PROJECT_ID,
      clientRef: "open-question-1",
      type: "OPEN_QUESTION",
      title: "Evidence path to choose",
      content:
        "Cần quyết định sau này dùng planned experiment hay source evidence để đánh giá claim.",
      status: "MISSING",
      sourceRefs: [],
      reason: "Chưa có quyết định của người dùng về evidence path.",
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
    {
      id: "00000000-0000-4000-8000-000000000302",
      projectId: LOCAL_PROJECT_ID,
      sourceNodeId: "00000000-0000-4000-8000-000000000102",
      targetNodeId: "00000000-0000-4000-8000-000000000103",
      type: "DERIVED_FROM",
      createdAt: "2026-08-13T00:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000303",
      projectId: LOCAL_PROJECT_ID,
      sourceNodeId: "00000000-0000-4000-8000-000000000105",
      targetNodeId: "00000000-0000-4000-8000-000000000106",
      type: "PART_OF",
      createdAt: "2026-08-13T00:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000304",
      projectId: LOCAL_PROJECT_ID,
      sourceNodeId: "00000000-0000-4000-8000-000000000106",
      targetNodeId: "00000000-0000-4000-8000-000000000104",
      type: "REQUIRES",
      createdAt: "2026-08-13T00:00:00Z",
    },
  ],
  warnings: [
    {
      code: "AMBIGUOUS",
      targetClientRef: "gap-1",
      targetType: "GAP",
      reason: "Gap candidate chưa có corpus hoặc provenance.",
      suggestedAction:
        "Review phạm vi gap sau khi có literature/evidence contract.",
    },
    {
      code: "UNSUPPORTED",
      targetClientRef: "claim-1",
      targetType: "CLAIM",
      reason: "Claim chưa có evidence đã xác minh hoặc planned experiment.",
      suggestedAction:
        "Link verified evidence or a planned experiment before handoff.",
    },
    {
      code: "MISSING",
      targetClientRef: null,
      targetType: "OPEN_QUESTION",
      reason: "Chưa có quyết định về evidence path.",
      suggestedAction:
        "Review the open question before continuing to the next step.",
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
    {
      id: "00000000-0000-4000-8000-000000000402",
      projectId: LOCAL_PROJECT_ID,
      nodeId: "00000000-0000-4000-8000-000000000101",
      fromStatus: "PROPOSED",
      toStatus: "USER_CONFIRMED",
      actor: "USER",
      authority: "USER",
      reason: "Fixture user confirmed the problem card.",
      occurredAt: "2026-08-13T00:01:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000403",
      projectId: LOCAL_PROJECT_ID,
      nodeId: "00000000-0000-4000-8000-000000000103",
      fromStatus: "PROPOSED",
      toStatus: "AMBIGUOUS",
      actor: "SYSTEM",
      authority: "SYSTEM",
      reason: "Fixture deterministic rule preserved the ambiguity finding.",
      occurredAt: "2026-08-13T00:02:00Z",
    },
  ],
};

export function cloneLocalGraph(): SpecGraphView {
  return structuredClone(LOCAL_GRAPH);
}
