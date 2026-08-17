import type { SpecGraphView, SpecNode } from "@specloop/schemas";

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

export function getLocalDevelopmentLabel(
  fixtureMode: boolean
): "LOCAL DEVELOPMENT FIXTURE" | null {
  return fixtureMode ? "LOCAL DEVELOPMENT FIXTURE" : null;
}
