import {
  SpecNodeTypeSchema,
  STEP2_REQUIRED_NODE_TYPES,
  type PersistedNodeStatus,
  type SpecGraphView,
  type SpecNode,
  type SpecNodeType,
  type Step2RequiredNodeType,
} from "@specloop/schemas";

export type NodeReviewRow = {
  clientRef: string;
  title: string;
  type: SpecNode["type"];
  content: string;
  status: SpecNode["status"];
  sourceCount: number;
  reason: string | null;
};

export type RelationReviewRow = {
  id: string;
  sourceClientRef: string;
  sourceTitle: string;
  targetClientRef: string;
  targetTitle: string;
  type: SpecGraphView["relations"][number]["type"];
};

export type Step2CoverageItem = {
  type: Step2RequiredNodeType;
  count: number;
  state: "PRESENT" | "MISSING";
};

export type Step2NodeFilters = {
  type: SpecNodeType | "ALL";
  status: PersistedNodeStatus | "ALL";
};

export type Step2Readiness = {
  ready: boolean;
  unresolvedRequiredTypes: Step2RequiredNodeType[];
  unresolvedNodeRefs: string[];
  unsupportedClaimCount: number;
};

const unresolvedStatuses = new Set<PersistedNodeStatus>([
  "NEEDS_REVIEW",
  "MISSING",
  "AMBIGUOUS",
  "UNSUPPORTED",
  "CONFLICT",
]);

export function buildNodeReviewRows(graph: SpecGraphView): NodeReviewRow[] {
  return graph.nodes.map((node) => ({
    clientRef: node.clientRef,
    title: node.title,
    type: node.type,
    content: node.content,
    status: node.status,
    sourceCount: node.sourceRefs.length,
    reason: node.reason ?? null,
  }));
}

export function buildRelationReviewRows(
  graph: SpecGraphView
): RelationReviewRow[] {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));

  return graph.relations.flatMap((relation) => {
    const source = nodesById.get(relation.sourceNodeId);
    const target = nodesById.get(relation.targetNodeId);
    if (!source || !target) return [];

    return [
      {
        id: relation.id,
        sourceClientRef: source.clientRef,
        sourceTitle: source.title,
        targetClientRef: target.clientRef,
        targetTitle: target.title,
        type: relation.type,
      },
    ];
  });
}

export function getGapCandidates(graph: SpecGraphView): SpecNode[] {
  return graph.nodes.filter((node) => node.type === "GAP");
}

export function buildStep2Coverage(graph: SpecGraphView): Step2CoverageItem[] {
  return STEP2_REQUIRED_NODE_TYPES.map((type) => {
    const count = graph.nodes.filter(
      (node) => node.type === type && node.status !== "USER_REJECTED"
    ).length;
    return { type, count, state: count > 0 ? "PRESENT" : "MISSING" };
  });
}

export function filterAndSortNodeReviewRows(
  rows: readonly NodeReviewRow[],
  filters: Step2NodeFilters
): NodeReviewRow[] {
  const requiredTypes = new Set<string>(STEP2_REQUIRED_NODE_TYPES);
  const orderedTypes = [
    ...STEP2_REQUIRED_NODE_TYPES,
    ...SpecNodeTypeSchema.options.filter((type) => !requiredTypes.has(type)),
  ];
  const typeOrder = new Map<SpecNodeType, number>(
    orderedTypes.map((type, index) => [type, index])
  );

  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => filters.type === "ALL" || row.type === filters.type)
    .filter(
      ({ row }) => filters.status === "ALL" || row.status === filters.status
    )
    .sort(
      (left, right) =>
        (typeOrder.get(left.row.type) ?? Number.MAX_SAFE_INTEGER) -
          (typeOrder.get(right.row.type) ?? Number.MAX_SAFE_INTEGER) ||
        left.index - right.index
    )
    .map(({ row }) => row);
}

export function calculateStep2Readiness(graph: SpecGraphView): Step2Readiness {
  const coverage = buildStep2Coverage(graph);
  const unresolvedRequiredTypes = coverage
    .filter((item) => item.state === "MISSING")
    .map((item) => item.type);
  const unresolvedNodeRefs = graph.nodes
    .filter((node) => unresolvedStatuses.has(node.status))
    .map((node) => node.clientRef);
  const unsupportedClaimCount = graph.nodes.filter(
    (node) => node.type === "CLAIM" && node.status === "UNSUPPORTED"
  ).length;

  return {
    ready:
      unresolvedRequiredTypes.length === 0 && unresolvedNodeRefs.length === 0,
    unresolvedRequiredTypes,
    unresolvedNodeRefs,
    unsupportedClaimCount,
  };
}

export function getLocalDevelopmentLabel(
  fixtureMode: boolean
): "LOCAL DEVELOPMENT FIXTURE" | null {
  return fixtureMode ? "LOCAL DEVELOPMENT FIXTURE" : null;
}
