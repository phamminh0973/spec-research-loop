"use client";

import {
  AlertTriangle,
  Check,
  FileText,
  History,
  Info,
  Link2,
  Pencil,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import type {
  SpecGraphView,
  SpecNode,
  SpecRelationType,
} from "@specloop/schemas";

import { trpc } from "@/lib/trpc";
import { AppShell } from "./app-shell";
import { cloneLocalGraph, LOCAL_PROJECT } from "./local-fixtures";
import {
  buildNodeReviewRows,
  buildRelationReviewRows,
  getGapCandidates,
  getLocalDevelopmentLabel,
  type NodeReviewRow,
  type RelationReviewRow,
} from "./workflow-model";
import {
  LocalDevelopmentBadge,
  SectionCard,
  SectionHeader,
  StatusPill,
} from "./section-card";

function errorMessage(error: { message?: string } | null | undefined) {
  return error?.message ?? "Step 2 operation failed.";
}

function typeLabel(type: SpecNode["type"] | SpecRelationType) {
  return type.replaceAll("_", " ");
}

const RELATION_TYPES: readonly SpecRelationType[] = [
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

function PageHeading() {
  return (
    <div className="page-heading">
      <span className="page-heading-icon" aria-hidden="true">
        <Search size={27} />
      </span>
      <div>
        <h1>2. Structured decomposition</h1>
        <p>
          Chuyển interpretation đã xác nhận thành typed cards có thể review và
          chỉnh sửa. Literature, source provenance và novelty assessment không
          được suy diễn ở màn hình này.
        </p>
      </div>
    </div>
  );
}

function Metrics({ graph }: { graph: SpecGraphView | null }) {
  const nodeCount = graph?.nodes.length ?? 0;
  const warningCount = graph?.warnings.length ?? 0;
  const reviewCount =
    graph?.nodes.filter((node) => node.status === "NEEDS_REVIEW").length ?? 0;
  const sourceCount =
    graph?.nodes.reduce((total, node) => total + node.sourceRefs.length, 0) ??
    0;

  return (
    <div className="metric-grid" aria-label="Decomposition summary">
      <div className="metric">
        <span className="metric-value">{nodeCount}</span>
        <span className="metric-label">typed nodes</span>
      </div>
      <div className="metric">
        <span className="metric-value">{reviewCount}</span>
        <span className="metric-label">needs review</span>
      </div>
      <div className="metric">
        <span className="metric-value">{warningCount}</span>
        <span className="metric-label">warnings</span>
      </div>
      <div className="metric">
        <span className="metric-value">{sourceCount}</span>
        <span className="metric-label">source refs</span>
      </div>
    </div>
  );
}

function ReviewRow({
  row,
  onSave,
  onCancel,
  onEdit,
  onConfirm,
  onReject,
  editing,
  draft,
  onDraftChange,
  pending,
}: {
  row: NodeReviewRow;
  editing: boolean;
  draft: { title: string; content: string; reason: string };
  pending: boolean;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onConfirm: () => void;
  onReject: () => void;
  onDraftChange: (draft: {
    title: string;
    content: string;
    reason: string;
  }) => void;
}) {
  return (
    <tr>
      <td>
        {editing ? (
          <div className="node-editor">
            <input
              className="text-input"
              value={draft.title}
              onChange={(event) =>
                onDraftChange({ ...draft, title: event.target.value })
              }
            />
            <span className="node-ref">{row.clientRef}</span>
          </div>
        ) : (
          <>
            <span className="node-title">{row.title}</span>
            <span className="node-ref">{row.clientRef}</span>
          </>
        )}
      </td>
      <td>
        <span className="node-type">{typeLabel(row.type)}</span>
      </td>
      <td>
        {editing ? (
          <div className="node-editor">
            <textarea
              className="text-area"
              value={draft.content}
              onChange={(event) =>
                onDraftChange({ ...draft, content: event.target.value })
              }
            />
            <input
              className="text-input"
              value={draft.reason}
              onChange={(event) =>
                onDraftChange({ ...draft, reason: event.target.value })
              }
              placeholder="Reason (optional)"
            />
          </div>
        ) : (
          <div className="node-content">
            {row.content}
            {row.reason ? (
              <p className="meta-text">Reason: {row.reason}</p>
            ) : null}
          </div>
        )}
      </td>
      <td>
        <StatusPill status={row.status} />
        <p className="meta-text">{row.sourceCount} source ref(s)</p>
      </td>
      <td>
        <div className="action-row">
          {editing ? (
            <>
              <button
                className="button button-primary button-small"
                type="button"
                onClick={onSave}
                disabled={pending}
              >
                <Check size={13} /> Lưu
              </button>
              <button
                className="button button-secondary button-small"
                type="button"
                onClick={onCancel}
                disabled={pending}
              >
                Huỷ
              </button>
            </>
          ) : (
            <>
              <button
                className="button button-secondary button-small"
                type="button"
                onClick={onEdit}
                disabled={pending}
              >
                <Pencil size={13} /> Sửa
              </button>
              {row.status !== "USER_CONFIRMED" ? (
                <button
                  className="button button-primary button-small"
                  type="button"
                  onClick={onConfirm}
                  disabled={pending}
                >
                  <Check size={13} /> Confirm
                </button>
              ) : null}
              {row.status !== "USER_REJECTED" ? (
                <button
                  className="button button-danger button-small"
                  type="button"
                  onClick={onReject}
                  disabled={pending}
                >
                  <X size={13} /> Reject
                </button>
              ) : null}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function RelationRow({
  row,
  onDelete,
  pending,
}: {
  row: RelationReviewRow;
  onDelete: () => void;
  pending: boolean;
}) {
  return (
    <tr>
      <td>
        <span className="node-title">{row.sourceTitle}</span>
        <span className="node-ref">{row.sourceClientRef}</span>
      </td>
      <td>
        <span className="node-type">{typeLabel(row.type)}</span>
      </td>
      <td>
        <span className="node-title">{row.targetTitle}</span>
        <span className="node-ref">{row.targetClientRef}</span>
      </td>
      <td>
        <button
          className="button button-danger button-small"
          type="button"
          onClick={onDelete}
          disabled={pending}
          aria-label={`Delete relation ${row.sourceClientRef} ${row.type} ${row.targetClientRef}`}
        >
          <Trash2 size={13} /> Xoá
        </button>
      </td>
    </tr>
  );
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
  const [draft, setDraft] = useState({ title: "", content: "", reason: "" });
  const [relationDraft, setRelationDraft] = useState<{
    sourceClientRef: string;
    targetClientRef: string;
    type: SpecRelationType;
  }>({
    sourceClientRef: "",
    targetClientRef: "",
    type: "ADDRESSES",
  });
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
    },
  });
  const deleteRelation = trpc.decomposition.deleteRelation.useMutation({
    onSuccess: (next) => {
      utils.decomposition.byProject.setData({ projectId }, next);
    },
  });

  const graph = fixtureMode ? localGraph : (graphQuery.data ?? null);
  const project = fixtureMode ? LOCAL_PROJECT : projectQuery.data;
  const pending =
    generate.isPending ||
    updateNode.isPending ||
    changeStatus.isPending ||
    createRelation.isPending ||
    deleteRelation.isPending;
  const error =
    generate.error ??
    updateNode.error ??
    changeStatus.error ??
    createRelation.error ??
    deleteRelation.error ??
    graphQuery.error;
  const rows = graph ? buildNodeReviewRows(graph) : [];
  const relationRows = graph ? buildRelationReviewRows(graph) : [];
  const gaps = graph ? getGapCandidates(graph) : [];
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
        nodes: graph.nodes.map((node) =>
          node.clientRef === clientRef
            ? { ...node, status: toStatus, updatedAt: occurredAt }
            : node
        ),
        statusHistory: [
          ...graph.statusHistory,
          {
            id: crypto.randomUUID(),
            projectId,
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
    if (
      !sourceClientRef ||
      !targetClientRef ||
      sourceClientRef === targetClientRef
    )
      return;

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
      if (duplicate) return;
      setLocalGraph({
        ...graph,
        relations: [
          ...graph.relations,
          {
            id: crypto.randomUUID(),
            projectId,
            sourceNodeId: source.id,
            targetNodeId: target.id,
            type: relationDraft.type,
            createdAt: new Date().toISOString(),
          },
        ],
      });
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
    >
      <div className="page-container">
        <PageHeading />

        {fixtureMode ? (
          <div className="alert alert-warning" role="status">
            <LocalDevelopmentBadge />
            <span>
              Fixture này chỉ mô phỏng typed decomposition. Không có paper,
              citation, source evidence hoặc novelty claim production.
            </span>
          </div>
        ) : null}

        {error ? (
          <div className="alert alert-error" role="alert">
            <ShieldAlert size={17} />
            <span>
              <strong>API-backed Step 2 gặp lỗi</strong>
              {errorMessage(error)}. Kiểm tra lại graph và context runtime; UI
              không tự chuyển sang fixture.
            </span>
          </div>
        ) : null}

        <SectionCard className="step2-actions-card">
          <div className="step2-actions" style={{ marginTop: 0 }}>
            <div>
              <p className="eyebrow">BR-01 GATE</p>
              <p className="helper-text">
                Server chỉ nhận <code>projectId</code> và tự đọc interpretation
                USER_CONFIRMED trước khi generate.
              </p>
            </div>
            <button
              className="button button-primary"
              type="button"
              onClick={handleGenerate}
              disabled={pending}
            >
              <Sparkles size={15} />
              {pending
                ? "Đang xử lý…"
                : graph
                  ? "Generate lại cards"
                  : "Generate typed cards"}
            </button>
          </div>
          <Metrics graph={graph} />
        </SectionCard>

        <div className="step2-grid" style={{ marginTop: 20 }}>
          <div className="stack-gap">
            <SectionCard>
              <SectionHeader icon={FileText} title="Review plan" tone="blue" />
              <ul className="bullet-list">
                <li>
                  Kiểm tra type, status, reason và source refs của từng card.
                </li>
                <li>Chỉnh sửa nội dung bằng mutation có validation ở API.</li>
                <li>Không dùng card này để khẳng định source hoặc novelty.</li>
              </ul>
            </SectionCard>
            <SectionCard>
              <SectionHeader
                icon={Info}
                title="Literature handoff"
                tone="neutral"
              />
              <div className="boundary-box">
                <h3>Step 3 boundary</h3>
                <p>
                  Search plan, priority sources và related-work provenance chưa
                  có contract Step 2. `search_arxiv` không phải generator của
                  decomposition và không được gọi từ UI này.
                </p>
              </div>
            </SectionCard>
          </div>

          <SectionCard>
            <SectionHeader
              icon={Search}
              title="Typed spec cards"
              tone="purple"
            />
            {rows.length > 0 ? (
              <div className="node-table-wrap">
                <table className="node-table">
                  <thead>
                    <tr>
                      <th>Card</th>
                      <th>Type</th>
                      <th>Content / reason</th>
                      <th>Status</th>
                      <th>Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <ReviewRow
                        key={row.clientRef}
                        row={row}
                        editing={editingRef === row.clientRef}
                        draft={draft}
                        pending={pending}
                        onSave={saveEdit}
                        onCancel={() => setEditingRef(null)}
                        onEdit={() => beginEdit(row)}
                        onConfirm={() =>
                          handleStatus(row.clientRef, "USER_CONFIRMED")
                        }
                        onReject={() =>
                          handleStatus(row.clientRef, "USER_REJECTED")
                        }
                        onDraftChange={setDraft}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : graphQuery.isPending && !fixtureMode ? (
              <p className="loading-state">Đang đọc graph view…</p>
            ) : (
              <div className="empty-state">
                <h3>Chưa có typed cards</h3>
                <p>
                  Chỉ generate sau khi server xác nhận BR-01, hoặc mở
                  `?fixture=1` để smoke-test local.
                </p>
              </div>
            )}
          </SectionCard>

          <div className="stack-gap">
            <SectionCard>
              <SectionHeader
                icon={AlertTriangle}
                title="Gap candidates"
                tone="amber"
              />
              {gaps.length > 0 ? (
                <div className="field-stack">
                  {gaps.map((gap) => (
                    <div className="gap-card" key={gap.clientRef}>
                      <h3>{gap.title}</h3>
                      <p>{gap.content}</p>
                      <div style={{ marginTop: 9 }}>
                        <StatusPill status={gap.status} />
                      </div>
                      <p style={{ marginTop: 9 }}>
                        Đây chỉ là candidate trong decomposition; cần
                        corpus-bounded evidence trước mọi kết luận.
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <h3>Chưa có GAP node</h3>
                  <p>Không tạo gap giả để lấp giao diện.</p>
                </div>
              )}
            </SectionCard>
            <SectionCard>
              <SectionHeader
                icon={AlertTriangle}
                title="Warnings"
                tone="amber"
              />
              {graph && graph.warnings.length > 0 ? (
                <ul className="warning-list">
                  {graph.warnings.map((warning, index) => (
                    <li
                      className="warning-item"
                      key={`${warning.code}-${warning.targetClientRef ?? index}`}
                    >
                      <strong>
                        {warning.code} · {warning.targetType}
                      </strong>
                      <p>{warning.reason}</p>
                      <p style={{ marginTop: 5 }}>
                        Action: {warning.suggestedAction}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-state">
                  <h3>Chưa có warnings</h3>
                  <p>Warnings sẽ xuất hiện từ graph output đã validate.</p>
                </div>
              )}
            </SectionCard>
          </div>
        </div>

        <div className="step2-grid" style={{ marginTop: 20 }}>
          <SectionCard>
            <SectionHeader icon={Link2} title="Relations" tone="blue" />
            <div className="field-stack">
              <label className="field-label">
                Source card
                <select
                  className="select-input"
                  value={relationSource}
                  onChange={(event) =>
                    setRelationDraft((current) => ({
                      ...current,
                      sourceClientRef: event.target.value,
                    }))
                  }
                  disabled={!graph || graph.nodes.length < 2 || pending}
                >
                  <option value="">Select source</option>
                  {graph?.nodes.map((node) => (
                    <option key={node.clientRef} value={node.clientRef}>
                      {node.title} ({node.clientRef})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Relation type
                <select
                  className="select-input"
                  value={relationDraft.type}
                  onChange={(event) =>
                    setRelationDraft((current) => ({
                      ...current,
                      type: event.target.value as SpecRelationType,
                    }))
                  }
                  disabled={!graph || graph.nodes.length < 2 || pending}
                >
                  {RELATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {typeLabel(type)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Target card
                <select
                  className="select-input"
                  value={relationTarget}
                  onChange={(event) =>
                    setRelationDraft((current) => ({
                      ...current,
                      targetClientRef: event.target.value,
                    }))
                  }
                  disabled={!graph || graph.nodes.length < 2 || pending}
                >
                  <option value="">Select target</option>
                  {graph?.nodes.map((node) => (
                    <option key={node.clientRef} value={node.clientRef}>
                      {node.title} ({node.clientRef})
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button button-primary"
                type="button"
                onClick={handleCreateRelation}
                disabled={!canCreateRelation || pending}
              >
                <Link2 size={15} /> Thêm relation
              </button>
            </div>
            {relationRows.length > 0 ? (
              <div className="node-table-wrap" style={{ marginTop: 18 }}>
                <table className="node-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Type</th>
                      <th>Target</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relationRows.map((row) => (
                      <RelationRow
                        key={row.id}
                        row={row}
                        pending={pending}
                        onDelete={() => handleDeleteRelation(row.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{ marginTop: 18 }}>
                <h3>Chưa có relation</h3>
                <p>Thêm quan hệ giữa các typed cards để làm rõ cấu trúc.</p>
              </div>
            )}
          </SectionCard>

          <SectionCard>
            <SectionHeader
              icon={History}
              title="Status history"
              tone="neutral"
            />
            {graph && graph.statusHistory.length > 0 ? (
              <div className="field-stack">
                {graph.statusHistory
                  .slice()
                  .reverse()
                  .map((change) => {
                    const node = graph.nodes.find(
                      (candidate) => candidate.id === change.nodeId
                    );
                    return (
                      <div className="gap-card" key={change.id}>
                        <div className="summary-meta">
                          <strong>{node?.title ?? change.nodeId}</strong>
                          <span className="meta-text">
                            {change.actor} · {change.authority}
                          </span>
                        </div>
                        <p style={{ marginTop: 7 }}>
                          {change.fromStatus ?? "—"} → {change.toStatus}
                        </p>
                        <p className="meta-text" style={{ marginTop: 5 }}>
                          {change.reason}
                        </p>
                        <p className="meta-text" style={{ marginTop: 5 }}>
                          {change.occurredAt}
                        </p>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="empty-state">
                <h3>Chưa có status history</h3>
                <p>Lịch sử sẽ xuất hiện sau generate hoặc review status.</p>
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard className="summary-card">
          <div className="summary-label">
            <span className="section-icon card-tone-purple" aria-hidden="true">
              <FileText size={18} />
            </span>
            <span>Step 2 review</span>
          </div>
          <div className="summary-meta">
            <span className="meta-text">
              {getLocalDevelopmentLabel(fixtureMode) ?? "API-backed mode"}
            </span>
            <StatusPill status={graph ? "AVAILABLE" : "MISSING"} />
          </div>
          <div className="summary-tip">
            <strong>Next boundary:</strong> Step 3 literature/evidence contract,
            không thuộc UI refresh này.
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
