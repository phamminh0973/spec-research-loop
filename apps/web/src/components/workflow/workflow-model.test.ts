import { describe, expect, it } from "vitest";

import {
  buildNodeReviewRows,
  getGapCandidates,
  getLocalDevelopmentLabel,
} from "./workflow-model";

const graph = {
  projectId: "00000000-0000-4000-8000-000000000001",
  nodes: [
    {
      id: "00000000-0000-4000-8000-000000000101",
      projectId: "00000000-0000-4000-8000-000000000001",
      clientRef: "problem-1",
      type: "PROBLEM" as const,
      title: "Problem",
      content: "A bounded problem.",
      status: "PROPOSED" as const,
      sourceRefs: [],
      createdAt: "2026-08-13T00:00:00Z",
      updatedAt: "2026-08-13T00:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000102",
      projectId: "00000000-0000-4000-8000-000000000001",
      clientRef: "gap-1",
      type: "GAP" as const,
      title: "Gap candidate",
      content: "A corpus-bounded candidate that needs review.",
      status: "NEEDS_REVIEW" as const,
      sourceRefs: ["00000000-0000-4000-8000-000000000201"],
      reason: "Needs supporting evidence.",
      createdAt: "2026-08-13T00:00:00Z",
      updatedAt: "2026-08-13T00:00:00Z",
    },
  ],
  relations: [],
  warnings: [],
  statusHistory: [],
};

describe("workflow UI model", () => {
  it("projects typed nodes into review rows without losing status or provenance counts", () => {
    expect(buildNodeReviewRows(graph)).toEqual([
      {
        clientRef: "problem-1",
        title: "Problem",
        type: "PROBLEM",
        content: "A bounded problem.",
        status: "PROPOSED",
        sourceCount: 0,
        reason: null,
      },
      {
        clientRef: "gap-1",
        title: "Gap candidate",
        type: "GAP",
        content: "A corpus-bounded candidate that needs review.",
        status: "NEEDS_REVIEW",
        sourceCount: 1,
        reason: "Needs supporting evidence.",
      },
    ]);
  });

  it("returns gap candidates as bounded review items, not global novelty claims", () => {
    expect(getGapCandidates(graph).map((node) => node.clientRef)).toEqual([
      "gap-1",
    ]);
  });

  it("labels fixture mode explicitly and leaves API mode unlabeled", () => {
    expect(getLocalDevelopmentLabel(true)).toBe("LOCAL DEVELOPMENT FIXTURE");
    expect(getLocalDevelopmentLabel(false)).toBeNull();
  });
});
