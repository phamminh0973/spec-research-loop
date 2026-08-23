"use client";

import { useState } from "react";
import type { SpecGraphView, SpecRelationType } from "@specloop/schemas";

import { Alert } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { AppShell } from "../shared/app-shell";
import { LOCAL_PROJECT } from "../shared/local-fixtures";
import { cloneLocalGraph } from "./step2-fixtures";
import {
  buildNodeReviewRows,
  buildRelationReviewRows,
  calculateStep2Readiness,
  filterAndSortNodeReviewRows,
  type NodeReviewRow,
  type RelationReviewRow,
  type Step2NodeFilters,
} from "./step2-model";
import { NodeReviewList } from "./node-review-list";
import { type NodeDraft } from "./node-review-card";
import { RelationsEditor, type RelationDraft } from "./relations-editor";
import { StatusHistoryPanel } from "./status-history-panel";
import { Step2Handoff } from "./step2-handoff";
import { Step2Overview } from "./step2-overview";
import { WarningsPanel } from "./warnings-panel";

const INITIAL_NODE_DRAFT: NodeDraft = {
  title: "",
  content: "",
  reason: "",
};

const INITIAL_RELATION_DRAFT: RelationDraft = {
  sourceClientRef: "",
  targetClientRef: "",
  type: "ADDRESSES",
};

const INITIAL_FILTERS: Step2NodeFilters = {
  type: "ALL",
  status: "ALL",
};

function errorMessage(error: { message?: string } | null | undefined) {
  return error?.message ?? "Step 2 operation failed.";
}

export function Step2Workspace({
  projectId,
  fixtureMode,
}: {
  projectId: string;
  fixtureMode: boolean;
}) {
  const [localGraph, setLocalGraph] = useState<SpecGraphView | null>(null);
  const [editingRef, setEditingRef] = useState<string | null>(null);
  const [draft, setDraft] = useState<NodeDraft>(INITIAL_NODE_DRAFT);
  const [relationDraft, setRelationDraft] = useState<RelationDraft>(
    INITIAL_RELATION_DRAFT
  );
  const [filters, setFilters] = useState<Step2NodeFilters>(INITIAL_FILTERS);
  const [localRelationError, setLocalRelationError] = useState<string | null>(
    null
  );

  const utils = trpc.useUtils();
  const projectQuery = trpc.projects.byId.useQuery(
    { id: projectId },
    { enabled: !fixtureMode, retry: false }
  );
  const graphQuery = trpc.decomposition.byProject.useQuery(
    { projectId },
    { enabled: !fixtureMode, retry: false }
  );
  const generate = trpc.decomposition.generate.useMutation({
    onSuccess: (next) => {
      utils.decomposition.byProject.setData({ projectId }, next);
    },
  });
  const updateNode = trpc.decomposition.updateNode.useMutation({
    onSuccess: (next) => {
      utils.decomposition.byProject.setData({ projectId }, next);
      setEditingRef(null);
    },
  });
  const changeStatus = trpc.decomposition.changeStatus.useMutation({
    onSuccess: (next) => {
      utils.decomposition.byProject.setData({ projectId }, next);
    },
  });
  const createRelation = trpc.decomposition.createRelation.useMutation({
    onSuccess: (next) => {
      utils.decomposition.byProject.setData({ projectId }, next);
      setLocalRelationError(null);
    },
  });
  const deleteRelation = trpc.decomposition.deleteRelation.useMutation({
    onSuccess: (next) => {
      utils.decomposition.byProject.setData({ projectId }, next);
      setLocalRelationError(null);
    },
  });

  const graph = fixtureMode ? localGraph : (graphQuery.data ?? null);
  const project = fixtureMode ? LOCAL_PROJECT : projectQuery.data;
  const readiness = graph ? calculateStep2Readiness(graph) : null;
  const pending =
    generate.isPending ||
    updateNode.isPending ||
    changeStatus.isPending ||
    createRelation.isPending ||
    deleteRelation.isPending;
  const operationError =
    generate.error ??
    updateNode.error ??
    changeStatus.error ??
    createRelation.error ??
    deleteRelation.error ??
    graphQuery.error;
  const relationError =
    localRelationError ??
    (createRelation.error ? errorMessage(createRelation.error) : null) ??
    (deleteRelation.error ? errorMessage(deleteRelation.error) : null);
  const rows = graph
    ? filterAndSortNodeReviewRows(buildNodeReviewRows(graph), filters)
    : [];
  const relationRows: RelationReviewRow[] = graph
    ? buildRelationReviewRows(graph)
    : [];
  const relationSource =
    relationDraft.sourceClientRef || graph?.nodes[0]?.clientRef || "";
  const relationTarget =
    relationDraft.targetClientRef || graph?.nodes[1]?.clientRef || "";
  const canCreateRelation =
    graph !== null &&
    graph.nodes.length > 1 &&
    relationSource.length > 0 &&
    relationTarget.length > 0 &&
    relationSource !== relationTarget;

  function handleGenerate() {
    setLocalRelationError(null);
    if (fixtureMode) {
      setLocalGraph(cloneLocalGraph());
      return;
    }
    generate.mutate({ projectId });
  }

  function beginEdit(row: NodeReviewRow) {
    setEditingRef(row.clientRef);
    setDraft({
      title: row.title,
      content: row.content,
      reason: row.reason ?? "",
    });
  }

  function saveEdit() {
    if (!editingRef || !draft.title.trim() || !draft.content.trim() || !graph)
      return;

    if (fixtureMode) {
      setLocalGraph({
        ...graph,
        nodes: graph.nodes.map((node) =>
          node.clientRef === editingRef
            ? {
                ...node,
                title: draft.title.trim(),
                content: draft.content.trim(),
                ...(draft.reason.trim()
                  ? { reason: draft.reason.trim() }
                  : { reason: undefined }),
                updatedAt: new Date().toISOString(),
              }
            : node
        ),
      });
      setEditingRef(null);
      return;
    }

    updateNode.mutate({
      projectId,
      clientRef: editingRef,
      title: draft.title.trim(),
      content: draft.content.trim(),
      reason: draft.reason.trim() || null,
    });
  }

  function handleStatus(
    clientRef: string,
    toStatus: "USER_CONFIRMED" | "USER_REJECTED"
  ) {
    if (!graph) return;
    if (fixtureMode) {
      const node = graph.nodes.find(
        (candidate) => candidate.clientRef === clientRef
      );
      if (!node) return;
      const occurredAt = new Date().toISOString();
      setLocalGraph({
        ...graph,
        nodes: graph.nodes.map((candidate) =>
          candidate.clientRef === clientRef
            ? { ...candidate, status: toStatus, updatedAt: occurredAt }
            : candidate
        ),
        statusHistory: [
          ...graph.statusHistory,
          {
            id: crypto.randomUUID(),
            projectId: graph.projectId,
            nodeId: node.id,
            fromStatus: node.status,
            toStatus,
            actor: "USER",
            authority: "USER",
            reason:
              toStatus === "USER_CONFIRMED"
                ? "User confirmed in local Step 2 fixture."
                : "User rejected in local Step 2 fixture.",
            occurredAt,
          },
        ],
      });
      return;
    }

    changeStatus.mutate({
      projectId,
      clientRef,
      toStatus,
      reason:
        toStatus === "USER_CONFIRMED"
          ? "User confirmed in Step 2 UI."
          : "User rejected in Step 2 UI.",
    });
  }

  function handleCreateRelation() {
    if (!graph) return;
    const sourceClientRef =
      relationDraft.sourceClientRef || graph.nodes[0]?.clientRef;
    const targetClientRef =
      relationDraft.targetClientRef || graph.nodes[1]?.clientRef;
    if (!sourceClientRef || !targetClientRef) return;
    if (sourceClientRef === targetClientRef) {
      setLocalRelationError("Self-relations are not allowed.");
      return;
    }

    if (fixtureMode) {
      const source = graph.nodes.find(
        (node) => node.clientRef === sourceClientRef
      );
      const target = graph.nodes.find(
        (node) => node.clientRef === targetClientRef
      );
      if (!source || !target) return;
      const duplicate = graph.relations.some(
        (relation) =>
          relation.sourceNodeId === source.id &&
          relation.targetNodeId === target.id &&
          relation.type === relationDraft.type
      );
      if (duplicate) {
        setLocalRelationError("The requested relation already exists.");
        return;
      }
      setLocalGraph({
        ...graph,
        relations: [
          ...graph.relations,
          {
            id: crypto.randomUUID(),
            projectId: graph.projectId,
            sourceNodeId: source.id,
            targetNodeId: target.id,
            type: relationDraft.type,
            createdAt: new Date().toISOString(),
          },
        ],
      });
      setLocalRelationError(null);
      return;
    }

    createRelation.mutate({
      projectId,
      sourceClientRef,
      targetClientRef,
      type: relationDraft.type,
    });
  }

  function handleDeleteRelation(relationId: string) {
    if (!graph) return;
    if (fixtureMode) {
      setLocalGraph({
        ...graph,
        relations: graph.relations.filter(
          (relation) => relation.id !== relationId
        ),
      });
      setLocalRelationError(null);
      return;
    }
    deleteRelation.mutate({ projectId, relationId });
  }

  return (
    <AppShell
      activeStep={2}
      projectId={projectId}
      projectTitle={project?.title}
      fixtureMode={fixtureMode}
      interpretationStatus="USER_CONFIRMED"
      hasGraph={Boolean(graph)}
      workflowFacts={{
        interpretationStatus: "USER_CONFIRMED",
        decompositionGenerated: Boolean(graph),
        decompositionReady: Boolean(graph && readiness?.ready),
      }}
    >
      <div className="space-y-8">
        <Step2Overview
          graph={graph}
          fixtureMode={fixtureMode}
          pending={pending}
          filters={filters}
          onFiltersChange={setFilters}
          onGenerate={handleGenerate}
        />

        {operationError ? (
          <Alert
            variant="destructive"
            className="bg-destructive/10 border-destructive/20 text-destructive"
            role="alert"
          >
            <div className="flex items-start gap-2">
              <ShieldAlert size={17} className="mt-0.5 shrink-0" />
              <span>
                <strong>API-backed Step 2 chưa khả dụng</strong>{" "}
                {errorMessage(operationError)}
              </span>
            </div>
          </Alert>
        ) : null}

        <section aria-labelledby="step2-cards-heading">
          <h2
            id="step2-cards-heading"
            className="text-foreground mb-4 text-lg font-semibold"
          >
            Reviewable typed cards
          </h2>
          <NodeReviewList
            rows={rows}
            editingRef={editingRef}
            draft={draft}
            pending={pending}
            loading={Boolean(graphQuery.isPending && !fixtureMode)}
            hasGraph={Boolean(graph)}
            onSave={saveEdit}
            onCancel={() => setEditingRef(null)}
            onEdit={beginEdit}
            onConfirm={(clientRef) => handleStatus(clientRef, "USER_CONFIRMED")}
            onReject={(clientRef) => handleStatus(clientRef, "USER_REJECTED")}
            onDraftChange={setDraft}
          />
        </section>

        <WarningsPanel graph={graph} />

        <div className="grid gap-6 lg:grid-cols-2">
          <RelationsEditor
            graph={graph}
            rows={relationRows}
            draft={relationDraft}
            sourceValue={relationSource}
            targetValue={relationTarget}
            canCreate={canCreateRelation}
            pending={pending}
            error={relationError}
            onDraftChange={(next) => {
              setRelationDraft(next);
              setLocalRelationError(null);
            }}
            onCreate={handleCreateRelation}
            onDelete={handleDeleteRelation}
          />
          <StatusHistoryPanel graph={graph} />
        </div>

        {graph && <Step2Handoff graph={graph} fixtureMode={fixtureMode} />}
      </div>
    </AppShell>
  );
}
