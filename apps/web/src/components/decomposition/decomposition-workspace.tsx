"use client";

import { useState, useTransition } from "react";
import type {
  NodeStatusHistory,
  SpecGraphView,
  SpecRelationType,
} from "@specloop/schemas";

import { trpc } from "@/lib/trpc";
import { NodeCard, type NodeDraft } from "./node-card";
import { WarningList } from "./warning-list";

const LOCAL_PROJECT_ID = "00000000-0000-4000-8000-000000000001";

const localFixtureGraph: SpecGraphView = {
  projectId: LOCAL_PROJECT_ID,
  nodes: [
    {
      id: "00000000-0000-4000-8000-000000000101",
      projectId: LOCAL_PROJECT_ID,
      clientRef: "problem-1",
      type: "PROBLEM",
      title: "Unclear research decision",
      content:
        "The research idea does not yet distinguish the decision, affected population, or measurable outcome.",
      status: "PROPOSED",
      sourceRefs: [],
      createdAt: "2026-08-11T00:00:00Z",
      updatedAt: "2026-08-11T00:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000102",
      projectId: LOCAL_PROJECT_ID,
      clientRef: "question-1",
      type: "RESEARCH_QUESTION",
      title: "Research question",
      content:
        "How should the decision be evaluated under the stated constraints?",
      status: "PROPOSED",
      sourceRefs: [],
      createdAt: "2026-08-11T00:00:00Z",
      updatedAt: "2026-08-11T00:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000103",
      projectId: LOCAL_PROJECT_ID,
      clientRef: "gap-1",
      type: "GAP",
      title: "Evidence gap",
      content:
        "The missing comparison and evaluation conditions still need to be specified.",
      status: "NEEDS_REVIEW",
      sourceRefs: [],
      createdAt: "2026-08-11T00:00:00Z",
      updatedAt: "2026-08-11T00:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000104",
      projectId: LOCAL_PROJECT_ID,
      clientRef: "claim-1",
      type: "CLAIM",
      title: "Candidate claim",
      content:
        "A candidate approach may improve the target outcome under the stated constraints.",
      status: "UNSUPPORTED",
      sourceRefs: [],
      createdAt: "2026-08-11T00:00:00Z",
      updatedAt: "2026-08-11T00:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000105",
      projectId: LOCAL_PROJECT_ID,
      clientRef: "evidence-1",
      type: "EVIDENCE",
      title: "Evidence requirement",
      content:
        "Specify the evidence or experiment needed to evaluate the candidate claim; no source or result is asserted here.",
      status: "PROPOSED",
      sourceRefs: [],
      createdAt: "2026-08-11T00:00:00Z",
      updatedAt: "2026-08-11T00:00:00Z",
    },
  ],
  relations: [
    {
      id: "00000000-0000-4000-8000-000000000201",
      projectId: LOCAL_PROJECT_ID,
      sourceNodeId: "00000000-0000-4000-8000-000000000101",
      targetNodeId: "00000000-0000-4000-8000-000000000102",
      type: "ADDRESSES",
      createdAt: "2026-08-11T00:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000202",
      projectId: LOCAL_PROJECT_ID,
      sourceNodeId: "00000000-0000-4000-8000-000000000104",
      targetNodeId: "00000000-0000-4000-8000-000000000105",
      type: "REQUIRES",
      createdAt: "2026-08-11T00:00:00Z",
    },
  ],
  warnings: [
    {
      code: "MISSING",
      targetClientRef: null,
      targetType: "CONTRIBUTION",
      reason: "No CONTRIBUTION card has been proposed in this local fixture.",
      suggestedAction: "Add or review a contribution card before continuing.",
    },
    {
      code: "UNSUPPORTED",
      targetClientRef: "claim-1",
      targetType: "CLAIM",
      reason:
        "The candidate claim has no supporting evidence or planned test relation.",
      suggestedAction: "Link the claim to evidence or a planned experiment.",
    },
  ],
  statusHistory: [],
};

const relationTypes: readonly SpecRelationType[] = [
  "ADDRESSES",
  "SUPPORTED_BY",
  "CONTRADICTED_BY",
  "TESTED_BY",
  "MEASURED_BY",
  "COMPARED_WITH",
  "REQUIRES",
  "LIMITED_BY",
  "DERIVED_FROM",
  "PART_OF",
];

const primaryButtonStyle = {
  background: "#145b8c",
  border: "1px solid #145b8c",
  borderRadius: 9,
  color: "#ffffff",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 750,
  padding: "10px 14px",
};

const quietButtonStyle = {
  background: "#ffffff",
  border: "1px solid #b9c9d8",
  borderRadius: 9,
  color: "#21425c",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 700,
  padding: "9px 12px",
};

const selectStyle = {
  background: "#ffffff",
  border: "1px solid #b9c9d8",
  borderRadius: 8,
  font: "inherit",
  minWidth: 150,
  padding: "9px 10px",
};

function now() {
  return new Date().toISOString();
}

function randomId() {
  return globalThis.crypto.randomUUID();
}

function relationKey(sourceNodeId: string, targetNodeId: string, type: string) {
  return `${sourceNodeId}:${targetNodeId}:${type}`;
}

function errorMessage(error: { message?: string } | null | undefined) {
  return error?.message ?? "The Step 2 operation failed.";
}

interface DecompositionWorkspaceProps {
  projectId?: string;
  fixtureMode?: boolean;
}

export function DecompositionWorkspace({
  projectId = LOCAL_PROJECT_ID,
  fixtureMode = false,
}: DecompositionWorkspaceProps) {
  const [fixtureGraph, setFixtureGraph] = useState<SpecGraphView | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sourceClientRef, setSourceClientRef] = useState("");
  const [targetClientRef, setTargetClientRef] = useState("");
  const [relationType, setRelationType] =
    useState<SpecRelationType>("ADDRESSES");
  const [isLocalPending, startLocalTransition] = useTransition();
  const utils = trpc.useUtils();

  const graphQuery = trpc.decomposition.byProject.useQuery(
    { projectId },
    { enabled: !fixtureMode, retry: false }
  );

  const applyApiGraph = (next: SpecGraphView) => {
    utils.decomposition.byProject.setData({ projectId }, next);
    setActionError(null);
  };

  const generateMutation = trpc.decomposition.generate.useMutation({
    onSuccess: applyApiGraph,
    onError: (error) => setActionError(errorMessage(error)),
  });
  const updateNodeMutation = trpc.decomposition.updateNode.useMutation({
    onSuccess: applyApiGraph,
    onError: (error) => setActionError(errorMessage(error)),
  });
  const createRelationMutation = trpc.decomposition.createRelation.useMutation({
    onSuccess: applyApiGraph,
    onError: (error) => setActionError(errorMessage(error)),
  });
  const deleteRelationMutation = trpc.decomposition.deleteRelation.useMutation({
    onSuccess: applyApiGraph,
    onError: (error) => setActionError(errorMessage(error)),
  });
  const changeStatusMutation = trpc.decomposition.changeStatus.useMutation({
    onSuccess: applyApiGraph,
    onError: (error) => setActionError(errorMessage(error)),
  });

  const graph = fixtureMode ? fixtureGraph : (graphQuery.data ?? null);
  const isLoading = !fixtureMode && graphQuery.isPending;
  const actionPending =
    isLocalPending ||
    generateMutation.isPending ||
    updateNodeMutation.isPending ||
    createRelationMutation.isPending ||
    deleteRelationMutation.isPending ||
    changeStatusMutation.isPending;

  function handleGenerate() {
    setActionError(null);
    if (fixtureMode) {
      startLocalTransition(() => setFixtureGraph(localFixtureGraph));
      return;
    }
    generateMutation.mutate({ projectId });
  }

  function handleSave(node: SpecGraphView["nodes"][number], draft: NodeDraft) {
    setActionError(null);
    if (fixtureMode) {
      startLocalTransition(() =>
        setFixtureGraph((current) =>
          current
            ? {
                ...current,
                nodes: current.nodes.map((candidate) =>
                  candidate.id === node.id
                    ? {
                        ...candidate,
                        title: draft.title,
                        content: draft.content,
                        updatedAt: now(),
                        ...(draft.reason === null
                          ? { reason: undefined }
                          : { reason: draft.reason }),
                      }
                    : candidate
                ),
              }
            : current
        )
      );
      return;
    }
    updateNodeMutation.mutate({
      projectId,
      clientRef: node.clientRef,
      title: draft.title,
      content: draft.content,
      reason: draft.reason,
    });
  }

  function handleStatus(
    node: SpecGraphView["nodes"][number],
    toStatus: "USER_CONFIRMED" | "USER_REJECTED"
  ) {
    const reason =
      toStatus === "USER_CONFIRMED"
        ? "The user confirmed this card in the local workspace."
        : "The user rejected this card in the local workspace.";
    setActionError(null);
    if (fixtureMode) {
      startLocalTransition(() =>
        setFixtureGraph((current) => {
          if (!current) return current;
          const occurredAt = now();
          const history: NodeStatusHistory = {
            id: randomId(),
            projectId: current.projectId,
            nodeId: node.id,
            fromStatus: node.status,
            toStatus,
            actor: "USER",
            authority: "USER",
            reason,
            occurredAt,
          };
          return {
            ...current,
            nodes: current.nodes.map((candidate) =>
              candidate.id === node.id
                ? { ...candidate, status: toStatus, updatedAt: occurredAt }
                : candidate
            ),
            statusHistory: [...current.statusHistory, history],
          };
        })
      );
      return;
    }
    changeStatusMutation.mutate({
      projectId,
      clientRef: node.clientRef,
      toStatus,
      reason,
    });
  }

  function handleCreateRelation() {
    if (!graph) return;
    const source = graph.nodes.find(
      (node) => node.clientRef === sourceClientRef
    );
    const target = graph.nodes.find(
      (node) => node.clientRef === targetClientRef
    );
    if (!source || !target) {
      setActionError(
        "Choose both a source and target card before creating a relation."
      );
      return;
    }
    if (source.id === target.id) {
      setActionError("Self-relations are not allowed.");
      return;
    }
    setActionError(null);

    if (fixtureMode) {
      const key = relationKey(source.id, target.id, relationType);
      if (
        graph.relations.some(
          (relation) =>
            relationKey(
              relation.sourceNodeId,
              relation.targetNodeId,
              relation.type
            ) === key
        )
      ) {
        setActionError("That relation already exists in the local fixture.");
        return;
      }
      startLocalTransition(() =>
        setFixtureGraph((current) =>
          current
            ? {
                ...current,
                relations: [
                  ...current.relations,
                  {
                    id: randomId(),
                    projectId: current.projectId,
                    sourceNodeId: source.id,
                    targetNodeId: target.id,
                    type: relationType,
                    createdAt: now(),
                  },
                ],
              }
            : current
        )
      );
      return;
    }
    createRelationMutation.mutate({
      projectId,
      sourceClientRef,
      targetClientRef,
      type: relationType,
    });
  }

  function handleDeleteRelation(relationId: string) {
    setActionError(null);
    if (fixtureMode) {
      startLocalTransition(() =>
        setFixtureGraph((current) =>
          current
            ? {
                ...current,
                relations: current.relations.filter(
                  (relation) => relation.id !== relationId
                ),
              }
            : current
        )
      );
      return;
    }
    deleteRelationMutation.mutate({ projectId, relationId });
  }

  const relationCounts = new Map<string, number>();
  const warningCounts = new Map<string, number>();
  if (graph) {
    for (const relation of graph.relations) {
      relationCounts.set(
        relation.sourceNodeId,
        (relationCounts.get(relation.sourceNodeId) ?? 0) + 1
      );
      relationCounts.set(
        relation.targetNodeId,
        (relationCounts.get(relation.targetNodeId) ?? 0) + 1
      );
    }
    for (const warning of graph.warnings) {
      if (warning.targetClientRef) {
        warningCounts.set(
          warning.targetClientRef,
          (warningCounts.get(warning.targetClientRef) ?? 0) + 1
        );
      }
    }
  }

  const nodeById = new Map(graph?.nodes.map((node) => [node.id, node]) ?? []);
  const defaultSource = sourceClientRef || graph?.nodes[0]?.clientRef || "";
  const defaultTarget =
    targetClientRef ||
    graph?.nodes[1]?.clientRef ||
    graph?.nodes[0]?.clientRef ||
    "";

  return (
    <main
      style={{
        background: "#f4f8fb",
        color: "#18324b",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        minHeight: "100vh",
        padding: "clamp(20px, 4vw, 56px)",
      }}
    >
      <div style={{ margin: "0 auto", maxWidth: 1180 }}>
        <header
          style={{
            alignItems: "flex-start",
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <div style={{ maxWidth: 700 }}>
            <p
              style={{
                color: "#18749c",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.16em",
                margin: 0,
              }}
            >
              STEP 2 · STRUCTURED DECOMPOSITION
            </p>
            <h1
              style={{
                color: "#102b43",
                fontSize: "clamp(32px, 5vw, 58px)",
                letterSpacing: "-0.04em",
                lineHeight: 1.02,
                margin: "12px 0",
              }}
            >
              Turn a confirmed idea into reviewable research logic.
            </h1>
            <p
              style={{
                color: "#506a80",
                fontSize: 17,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              Edit typed cards, inspect reasoned warnings, and keep authority
              changes visible before any later evidence work begins.
            </p>
          </div>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #d4e0ea",
              borderRadius: 12,
              color: "#506a80",
              fontSize: 13,
              lineHeight: 1.55,
              maxWidth: 270,
              padding: 14,
            }}
          >
            <strong style={{ color: "#18324b", display: "block" }}>
              Project workspace
            </strong>
            <span>{projectId}</span>
            {fixtureMode && (
              <strong
                style={{ color: "#925b00", display: "block", marginTop: 8 }}
              >
                LOCAL DEVELOPMENT FIXTURE · no API writes
              </strong>
            )}
          </div>
        </header>

        {fixtureMode && (
          <aside
            role="note"
            style={{
              background: "#fff4d8",
              border: "1px solid #e8c36c",
              borderRadius: 10,
              color: "#674700",
              marginBottom: 18,
              padding: "11px 14px",
            }}
          >
            This local fixture contains only typed research requirements. It
            does not assert papers, citations, experimental results, or
            production persistence. Remove <code>?fixture=1</code> to use the
            API-backed workspace.
          </aside>
        )}

        <section
          style={{
            alignItems: "center",
            background: "#e6f1f8",
            border: "1px solid #c7dce9",
            borderRadius: 14,
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            justifyContent: "space-between",
            marginBottom: 18,
            padding: 16,
          }}
        >
          <div>
            <strong style={{ color: "#153c58", display: "block" }}>
              {fixtureMode ? "Confirmed fixture ready" : "Confirmation gate"}
            </strong>
            <span style={{ color: "#4f6d82", fontSize: 14 }}>
              {fixtureMode
                ? "Generate a local, visibly labeled graph to exercise the review flow."
                : "The server loads USER_CONFIRMED interpretation state; the client sends only the project ID."}
            </span>
          </div>
          <button
            type="button"
            style={{ ...primaryButtonStyle, opacity: actionPending ? 0.65 : 1 }}
            onClick={handleGenerate}
            disabled={actionPending}
          >
            {actionPending ? "Working…" : "Generate decomposition"}
          </button>
        </section>

        {actionError && (
          <p
            role="alert"
            style={{
              background: "#fff0f0",
              border: "1px solid #efb7b7",
              borderRadius: 10,
              color: "#8e2f2f",
              margin: "0 0 18px",
              padding: "11px 14px",
            }}
          >
            {actionError}
          </p>
        )}

        {isLoading && (
          <p
            aria-live="polite"
            style={{
              background: "#ffffff",
              border: "1px solid #d4e0ea",
              borderRadius: 14,
              color: "#506a80",
              padding: 18,
            }}
          >
            Loading the reviewed decomposition…
          </p>
        )}

        {!fixtureMode && graphQuery.isError && (
          <section
            role="alert"
            style={{
              background: "#fff0f0",
              border: "1px solid #efb7b7",
              borderRadius: 14,
              color: "#8e2f2f",
              marginBottom: 18,
              padding: 18,
            }}
          >
            <h2 style={{ fontSize: 19, margin: "0 0 8px" }}>
              API-backed workspace unavailable
            </h2>
            <p style={{ lineHeight: 1.5, margin: 0 }}>
              {graphQuery.error.message}. This is an expected unresolved runtime
              dependency until Step 1, persistence and the production generator
              are integrated.
            </p>
            <a
              href="?fixture=1"
              style={{
                color: "#7b2929",
                display: "inline-block",
                fontWeight: 750,
                marginTop: 12,
              }}
            >
              Open the visibly labeled local fixture mode
            </a>
          </section>
        )}

        {!isLoading && !graphQuery.isError && !graph && (
          <section
            style={{
              background: "#ffffff",
              border: "1px dashed #b9c9d8",
              borderRadius: 14,
              color: "#506a80",
              marginBottom: 18,
              padding: 24,
              textAlign: "center",
            }}
          >
            <h2 style={{ color: "#18324b", marginTop: 0 }}>
              No reviewed cards yet
            </h2>
            <p style={{ lineHeight: 1.5 }}>
              Generate after the confirmation gate, then review the cards and
              warnings here.
            </p>
          </section>
        )}

        {graph && (
          <>
            <WarningList warnings={graph.warnings} />

            <section
              aria-labelledby="relation-editor-title"
              style={{
                background: "#ffffff",
                border: "1px solid #d4e0ea",
                borderRadius: 16,
                marginTop: 18,
                padding: 18,
              }}
            >
              <div
                style={{
                  alignItems: "baseline",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <h2
                    id="relation-editor-title"
                    style={{ color: "#18324b", fontSize: 19, margin: 0 }}
                  >
                    Relations
                  </h2>
                  <p
                    style={{
                      color: "#60758a",
                      fontSize: 14,
                      margin: "5px 0 0",
                    }}
                  >
                    Explicit table actions keep the P0 workspace reviewable
                    without a graph canvas.
                  </p>
                </div>
                <span style={{ color: "#60758a", fontSize: 13 }}>
                  {graph.relations.length} total
                </span>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleCreateRelation();
                }}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 9,
                  marginTop: 15,
                }}
              >
                <select
                  aria-label="Relation source"
                  style={selectStyle}
                  value={defaultSource}
                  onChange={(event) => setSourceClientRef(event.target.value)}
                  disabled={actionPending}
                >
                  <option value="">Source card</option>
                  {graph.nodes.map((node) => (
                    <option key={node.id} value={node.clientRef}>
                      {node.type} · {node.clientRef}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Relation type"
                  style={selectStyle}
                  value={relationType}
                  onChange={(event) =>
                    setRelationType(event.target.value as SpecRelationType)
                  }
                  disabled={actionPending}
                >
                  {relationTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Relation target"
                  style={selectStyle}
                  value={defaultTarget}
                  onChange={(event) => setTargetClientRef(event.target.value)}
                  disabled={actionPending}
                >
                  <option value="">Target card</option>
                  {graph.nodes.map((node) => (
                    <option key={node.id} value={node.clientRef}>
                      {node.type} · {node.clientRef}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  style={quietButtonStyle}
                  disabled={actionPending}
                >
                  Add relation
                </button>
              </form>

              {graph.relations.length > 0 ? (
                <div style={{ overflowX: "auto", marginTop: 16 }}>
                  <table
                    style={{
                      borderCollapse: "collapse",
                      minWidth: 620,
                      width: "100%",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          borderBottom: "1px solid #d4e0ea",
                          textAlign: "left",
                        }}
                      >
                        <th style={{ padding: "9px 8px" }}>From</th>
                        <th style={{ padding: "9px 8px" }}>Type</th>
                        <th style={{ padding: "9px 8px" }}>To</th>
                        <th style={{ padding: "9px 8px" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {graph.relations.map((relation) => (
                        <tr
                          key={relation.id}
                          style={{ borderBottom: "1px solid #edf2f6" }}
                        >
                          <td style={{ padding: "10px 8px" }}>
                            {nodeById.get(relation.sourceNodeId)?.clientRef ??
                              relation.sourceNodeId}
                          </td>
                          <td
                            style={{
                              color: "#145b8c",
                              fontWeight: 750,
                              padding: "10px 8px",
                            }}
                          >
                            {relation.type}
                          </td>
                          <td style={{ padding: "10px 8px" }}>
                            {nodeById.get(relation.targetNodeId)?.clientRef ??
                              relation.targetNodeId}
                          </td>
                          <td style={{ padding: "10px 8px" }}>
                            <button
                              type="button"
                              style={{
                                ...quietButtonStyle,
                                color: "#8e2f2f",
                                padding: "6px 9px",
                              }}
                              onClick={() => handleDeleteRelation(relation.id)}
                              disabled={actionPending}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: "#60758a", marginBottom: 0 }}>
                  No relations have been added.
                </p>
              )}
            </section>

            <section aria-labelledby="cards-title" style={{ marginTop: 22 }}>
              <div
                style={{
                  alignItems: "baseline",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <h2
                  id="cards-title"
                  style={{ color: "#18324b", fontSize: 22, margin: 0 }}
                >
                  Typed cards
                </h2>
                <span style={{ color: "#60758a", fontSize: 13 }}>
                  {graph.nodes.length} cards · edits remain explicit
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  marginTop: 14,
                }}
              >
                {graph.nodes.map((node) => (
                  <NodeCard
                    key={`${node.id}-${node.updatedAt}`}
                    node={node}
                    relationCount={relationCounts.get(node.id) ?? 0}
                    warningCount={warningCounts.get(node.clientRef) ?? 0}
                    disabled={actionPending}
                    onSave={handleSave}
                    onConfirm={(candidate) =>
                      handleStatus(candidate, "USER_CONFIRMED")
                    }
                    onReject={(candidate) =>
                      handleStatus(candidate, "USER_REJECTED")
                    }
                  />
                ))}
              </div>
            </section>

            <section
              aria-labelledby="status-history-title"
              style={{
                background: "#ffffff",
                border: "1px solid #d4e0ea",
                borderRadius: 16,
                marginTop: 18,
                padding: 18,
              }}
            >
              <h2
                id="status-history-title"
                style={{ color: "#18324b", fontSize: 19, margin: 0 }}
              >
                Status history
              </h2>
              {graph.statusHistory.length === 0 ? (
                <p style={{ color: "#60758a", marginBottom: 0 }}>
                  No user status changes recorded yet.
                </p>
              ) : (
                <ol
                  style={{
                    color: "#506a80",
                    lineHeight: 1.5,
                    marginBottom: 0,
                    paddingLeft: 20,
                  }}
                >
                  {graph.statusHistory.map((change) => (
                    <li key={change.id}>
                      <strong>{change.toStatus}</strong> · {change.reason} ·{" "}
                      {change.actor}/{change.authority}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export { LOCAL_PROJECT_ID };
