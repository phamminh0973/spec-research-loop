import {
  type SpecGraphView,
  SpecGraphViewSchema,
  STEP2_REQUIRED_NODE_TYPES,
} from "@specloop/schemas";
import { describe, expect, it } from "vitest";
import { cloneLocalGraph } from "./step2-fixtures";
import {
  buildNodeReviewRows,
  buildRelationReviewRows,
  buildStep2Coverage,
  calculateStep2Readiness,
  filterAndSortNodeReviewRows,
  getGapCandidates,
  getLocalDevelopmentLabel,
} from "./step2-model";

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

const completeGraph: SpecGraphView = {
  ...graph,
  nodes: STEP2_REQUIRED_NODE_TYPES.map((type, index) => ({
    id: `00000000-0000-4000-8000-000000000${String(index + 101).padStart(3, "0")}`,
    projectId: graph.projectId,
    clientRef: `${type.toLowerCase()}-1`,
    type,
    title: `${type} title`,
    content: `${type} content`,
    status: "PROPOSED" as const,
    sourceRefs: [],
    createdAt: "2026-08-13T00:00:00Z",
    updatedAt: "2026-08-13T00:00:00Z",
  })),
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

  it("builds relation review rows from node references", () => {
    const relationGraph = {
      ...graph,
      relations: [
        {
          id: "00000000-0000-4000-8000-000000000301",
          projectId: graph.projectId,
          sourceNodeId: graph.nodes[0]?.id,
          targetNodeId: graph.nodes[1]?.id,
          type: "ADDRESSES" as const,
          createdAt: "2026-08-13T00:00:00Z",
        },
      ],
    };

    expect(buildRelationReviewRows(relationGraph)).toEqual([
      {
        id: "00000000-0000-4000-8000-000000000301",
        sourceClientRef: "problem-1",
        sourceTitle: "Problem",
        targetClientRef: "gap-1",
        targetTitle: "Gap candidate",
        type: "ADDRESSES",
      },
    ]);
  });

  it("builds coverage in assignment order and excludes optional risk", () => {
    const coverage = buildStep2Coverage(completeGraph);

    expect(coverage).toEqual(
      STEP2_REQUIRED_NODE_TYPES.map((type) => ({
        type,
        count: 1,
        state: "PRESENT",
      }))
    );
    expect(coverage.map((item) => item.type)).not.toContain("RISK");
  });

  it("marks evidence missing even when an optional risk card exists", () => {
    const graphWithRisk = {
      ...completeGraph,
      nodes: completeGraph.nodes
        .filter((node) => node.type !== "EVIDENCE")
        .concat({
          ...completeGraph.nodes[0]!,
          id: "00000000-0000-4000-8000-000000000199",
          clientRef: "risk-1",
          type: "RISK" as const,
        }),
    };

    expect(buildStep2Coverage(graphWithRisk)).toContainEqual({
      type: "EVIDENCE",
      count: 0,
      state: "MISSING",
    });
  });

  it("filters and sorts review rows without mutating their input", () => {
    const rows = buildNodeReviewRows({
      ...completeGraph,
      nodes: [
        completeGraph.nodes.find((node) => node.type === "CLAIM")!,
        completeGraph.nodes.find((node) => node.type === "PROBLEM")!,
        completeGraph.nodes.find((node) => node.type === "GAP")!,
      ],
    });
    const originalOrder = rows.map((row) => row.type);

    expect(
      filterAndSortNodeReviewRows(rows, { type: "ALL", status: "ALL" })
    ).toEqual([
      expect.objectContaining({ type: "PROBLEM" }),
      expect.objectContaining({ type: "GAP" }),
      expect.objectContaining({ type: "CLAIM" }),
    ]);
    expect(
      filterAndSortNodeReviewRows(rows, {
        type: "GAP",
        status: "NEEDS_REVIEW",
      })
    ).toHaveLength(0);
    expect(rows.map((row) => row.type)).toEqual(originalOrder);
  });

  it("blocks readiness for missing required types and unresolved cards", () => {
    const readiness = calculateStep2Readiness({
      ...completeGraph,
      nodes: completeGraph.nodes.map((node) =>
        node.type === "EVIDENCE"
          ? { ...node, status: "USER_REJECTED" as const }
          : node.type === "CLAIM"
            ? { ...node, status: "UNSUPPORTED" as const }
            : node
      ),
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.unresolvedRequiredTypes).toEqual(["EVIDENCE"]);
    expect(readiness.unresolvedNodeRefs).toContain("claim-1");
    expect(readiness.unsupportedClaimCount).toBe(1);
  });

  it("reports ready when every required card is reviewable", () => {
    expect(calculateStep2Readiness(completeGraph)).toEqual({
      ready: true,
      unresolvedRequiredTypes: [],
      unresolvedNodeRefs: [],
      unsupportedClaimCount: 0,
    });
  });

  it("provides a complete local Step 2 review fixture", () => {
    const fixture = cloneLocalGraph();
    const fixtureTypes = new Set(fixture.nodes.map((node) => node.type));
    const authorities = new Set(
      fixture.statusHistory.map((entry) => entry.authority)
    );

    expect(SpecGraphViewSchema.parse(fixture)).toEqual(fixture);
    expect(
      STEP2_REQUIRED_NODE_TYPES.every((type) => fixtureTypes.has(type))
    ).toBe(true);
    expect(fixture.nodes.some((node) => node.type === "RISK")).toBe(true);
    expect(fixture.relations.length).toBeGreaterThan(0);
    expect(fixture.warnings.length).toBeGreaterThan(0);
    expect(authorities).toEqual(new Set(["AI", "USER", "SYSTEM"]));
  });
});
