"use client";

import {
  AlertTriangle,
  Check,
  FileText,
  Info,
  Pencil,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import type { SpecGraphView, SpecNode } from "@specloop/schemas";

import { trpc } from "@/lib/trpc";
import { AppShell } from "./app-shell";
import { cloneLocalGraph, LOCAL_PROJECT } from "./local-fixtures";
import {
  buildNodeReviewRows,
  getGapCandidates,
  getLocalDevelopmentLabel,
  type NodeReviewRow,
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

function typeLabel(type: SpecNode["type"]) {
  return type.replaceAll("_", " ");
}

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

  const graph = fixtureMode ? localGraph : (graphQuery.data ?? null);
  const project = fixtureMode ? LOCAL_PROJECT : projectQuery.data;
  const pending =
    generate.isPending || updateNode.isPending || changeStatus.isPending;
  const error =
    generate.error ??
    updateNode.error ??
    changeStatus.error ??
    graphQuery.error;
  const rows = graph ? buildNodeReviewRows(graph) : [];
  const gaps = graph ? getGapCandidates(graph) : [];

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
      setLocalGraph({
        ...graph,
        nodes: graph.nodes.map((node) =>
          node.clientRef === clientRef ? { ...node, status: toStatus } : node
        ),
        statusHistory: graph.statusHistory,
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
              <strong>API-backed Step 2 chưa khả dụng</strong>
              {errorMessage(error)}. HTTP context hiện chưa compose production
              <code>SpecStructureModule</code>; không tự chuyển sang fixture.
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
