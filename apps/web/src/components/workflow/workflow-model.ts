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

export function getGapCandidates(graph: SpecGraphView): SpecNode[] {
  return graph.nodes.filter((node) => node.type === "GAP");
}

export function getLocalDevelopmentLabel(
  fixtureMode: boolean
): "LOCAL DEVELOPMENT FIXTURE" | null {
  return fixtureMode ? "LOCAL DEVELOPMENT FIXTURE" : null;
}
