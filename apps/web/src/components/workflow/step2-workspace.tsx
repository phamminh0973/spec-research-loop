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
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

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
    <div className="mb-8 flex items-start gap-4">
      <span
        className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-xl"
        aria-hidden="true"
      >
        <Search size={27} />
      </span>
      <div>
        <h1 className="text-foreground text-2xl font-bold">
          2. Structured decomposition
        </h1>
        <p className="text-muted-foreground mt-1">
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
    <div
      className="grid grid-cols-2 gap-4 md:grid-cols-4"
      aria-label="Decomposition summary"
    >
      <div className="bg-muted rounded-lg p-4 text-center">
        <span className="text-foreground text-2xl font-bold">{nodeCount}</span>
        <span className="text-muted-foreground block text-sm">typed nodes</span>
      </div>
      <div className="bg-muted rounded-lg p-4 text-center">
        <span className="text-foreground text-2xl font-bold">
          {reviewCount}
        </span>
        <span className="text-muted-foreground block text-sm">
          needs review
        </span>
      </div>
      <div className="bg-muted rounded-lg p-4 text-center">
        <span className="text-foreground text-2xl font-bold">
          {warningCount}
        </span>
        <span className="text-muted-foreground block text-sm">warnings</span>
      </div>
      <div className="bg-muted rounded-lg p-4 text-center">
        <span className="text-foreground text-2xl font-bold">
          {sourceCount}
        </span>
        <span className="text-muted-foreground block text-sm">source refs</span>
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
    <tr className="border-border border-b">
      <td className="py-4">
        {editing ? (
          <div className="space-y-2">
            <Input
              value={draft.title}
              onChange={(event) =>
                onDraftChange({ ...draft, title: event.target.value })
              }
              className="w-full"
            />
            <Badge variant="secondary" className="text-xs">
              {row.clientRef}
            </Badge>
          </div>
        ) : (
          <>
            <p className="text-foreground font-medium">{row.title}</p>
            <Badge variant="secondary" className="mt-1 text-xs">
              {row.clientRef}
            </Badge>
          </>
        )}
      </td>
      <td className="py-4">
        <Badge variant="outline" className="text-xs">
          {typeLabel(row.type)}
        </Badge>
      </td>
      <td className="max-w-md py-4">
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft.content}
              onChange={(event) =>
                onDraftChange({ ...draft, content: event.target.value })
              }
              rows={3}
              className="w-full"
            />
            <Input
              value={draft.reason}
              onChange={(event) =>
                onDraftChange({ ...draft, reason: event.target.value })
              }
              placeholder="Reason (optional)"
              className="w-full"
            />
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-foreground text-sm">{row.content}</p>
            {row.reason ? (
              <p className="text-muted-foreground text-xs">
                Reason: {row.reason}
              </p>
            ) : null}
          </div>
        )}
      </td>
      <td className="py-4">
        <div className="space-y-1">
          <StatusPill status={row.status} />
          <p className="text-muted-foreground text-xs">
            {row.sourceCount} source ref(s)
          </p>
        </div>
      </td>
      <td className="py-4">
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button size="sm" onClick={onSave} disabled={pending}>
                <Check size={13} className="mr-1" /> Lưu
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={pending}
              >
                Huỷ
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                disabled={pending}
              >
                <Pencil size={13} className="mr-1" /> Sửa
              </Button>
              {row.status !== "USER_CONFIRMED" ? (
                <Button size="sm" onClick={onConfirm} disabled={pending}>
                  <Check size={13} className="mr-1" /> Confirm
                </Button>
              ) : null}
              {row.status !== "USER_REJECTED" ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onReject}
                  disabled={pending}
                >
                  <X size={13} className="mr-1" /> Reject
                </Button>
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
    <tr className="border-border border-b last:border-0">
      <td className="px-4 py-4 align-top">
        <p className="text-foreground font-medium">{row.sourceTitle}</p>
        <Badge variant="secondary" className="mt-1 text-xs">
          {row.sourceClientRef}
        </Badge>
      </td>
      <td className="px-4 py-4 align-top">
        <Badge variant="outline" className="text-xs">
          {typeLabel(row.type)}
        </Badge>
      </td>
      <td className="px-4 py-4 align-top">
        <p className="text-foreground font-medium">{row.targetTitle}</p>
        <Badge variant="secondary" className="mt-1 text-xs">
          {row.targetClientRef}
        </Badge>
      </td>
      <td className="px-4 py-4 align-top">
        <Button
          variant="destructive"
          size="sm"
          type="button"
          onClick={onDelete}
          disabled={pending}
          aria-label={`Delete relation ${row.sourceClientRef} ${row.type} ${row.targetClientRef}`}
        >
          <Trash2 size={13} className="mr-1" /> Xoá
        </Button>
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
      <div className="space-y-8">
        <PageHeading />

        {fixtureMode ? (
          <Alert
            className="border-amber-200 bg-amber-50 text-amber-800"
            role="status"
          >
            <div className="flex items-center gap-2">
              <LocalDevelopmentBadge />
              <span>
                Fixture này chỉ mô phỏng typed decomposition. Không có paper,
                citation, source evidence hoặc novelty claim production.
              </span>
            </div>
          </Alert>
        ) : null}

        {error ? (
          <Alert
            variant="destructive"
            className="bg-destructive/10 border-destructive/20 text-destructive"
            role="alert"
          >
            <div className="flex items-start gap-2">
              <ShieldAlert size={17} className="mt-0.5 shrink-0" />
              <span>
                <strong>API-backed Step 2 chưa khả dụng</strong>
                {errorMessage(error)}. HTTP context hiện chưa compose production
                <code className="bg-muted rounded px-1">
                  SpecStructureModule
                </code>
                ; không tự chuyển sang fixture.
              </span>
            </div>
          </Alert>
        ) : null}

        <SectionCard>
          <CardContent className="pt-0">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  BR-01 GATE
                </p>
                <p className="text-muted-foreground text-sm">
                  Server chỉ nhận{" "}
                  <code className="bg-muted rounded px-1">projectId</code> và tự
                  đọc interpretation USER_CONFIRMED trước khi generate.
                </p>
              </div>
              <Button onClick={handleGenerate} disabled={pending}>
                <Sparkles size={15} className="mr-2" />
                {pending
                  ? "Đang xử lý…"
                  : graph
                    ? "Generate lại cards"
                    : "Generate typed cards"}
              </Button>
            </div>
            <Metrics graph={graph} />
          </CardContent>
        </SectionCard>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <SectionCard>
              <SectionHeader icon={FileText} title="Review plan" tone="blue" />
              <ul className="text-muted-foreground space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 flex size-1.5 shrink-0 rounded-full bg-current" />
                  Kiểm tra type, status, reason và source refs của từng card.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 flex size-1.5 shrink-0 rounded-full bg-current" />
                  Chỉnh sửa nội dung bằng mutation có validation ở API.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 flex size-1.5 shrink-0 rounded-full bg-current" />
                  Không dùng card này để khẳng định source hoặc novelty.
                </li>
              </ul>
            </SectionCard>
            <SectionCard>
              <SectionHeader
                icon={Info}
                title="Literature handoff"
                tone="neutral"
              />
              <div className="border-border bg-muted/50 rounded-lg border p-4">
                <h3 className="text-foreground mb-2 font-semibold">
                  Step 3 boundary
                </h3>
                <p className="text-muted-foreground text-sm">
                  Search plan, priority sources và related-work provenance chưa
                  có contract Step 2.{" "}
                  <code className="bg-muted rounded px-1">search_arxiv</code>{" "}
                  không phải generator của decomposition và không được gọi từ UI
                  này.
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-border border-b">
                      <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                        Card
                      </th>
                      <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                        Type
                      </th>
                      <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                        Content / reason
                      </th>
                      <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                        Status
                      </th>
                      <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                        Review
                      </th>
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
              <p className="text-muted-foreground py-8 text-center">
                Đang đọc graph view…
              </p>
            ) : (
              <div className="py-8 text-center">
                <h3 className="text-foreground mb-1 font-semibold">
                  Chưa có typed cards
                </h3>
                <p className="text-muted-foreground text-sm">
                  Chỉ generate sau khi server xác nhận BR-01, hoặc mở
                  <code className="bg-muted rounded px-1">?fixture=1</code> để
                  smoke-test local.
                </p>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <SectionCard>
              <SectionHeader
                icon={AlertTriangle}
                title="Gap candidates"
                tone="amber"
              />
              {gaps.length > 0 ? (
                <div className="space-y-4">
                  {gaps.map((gap) => (
                    <div
                      key={gap.clientRef}
                      className="border-border bg-card rounded-lg border p-4"
                    >
                      <h3 className="text-foreground font-semibold">
                        {gap.title}
                      </h3>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {gap.content}
                      </p>
                      <div className="mt-3">
                        <StatusPill status={gap.status} />
                      </div>
                      <p className="text-muted-foreground mt-3 text-xs">
                        Đây chỉ là candidate trong decomposition; cần
                        corpus-bounded evidence trước mọi kết luận.
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <h3 className="text-foreground mb-1 font-semibold">
                    Chưa có GAP node
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Không tạo gap giả để lấp giao diện.
                  </p>
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
                <ul className="space-y-4">
                  {graph.warnings.map((warning, index) => (
                    <li
                      key={`${warning.code}-${warning.targetClientRef ?? index}`}
                      className="border-border bg-card rounded-lg border p-4"
                    >
                      <strong className="text-foreground">
                        {warning.code} · {warning.targetType}
                      </strong>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {warning.reason}
                      </p>
                      <p className="text-muted-foreground mt-2 text-xs">
                        Action: {warning.suggestedAction}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-8 text-center">
                  <h3 className="text-foreground mb-1 font-semibold">
                    Chưa có warnings
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Warnings sẽ xuất hiện từ graph output đã validate.
                  </p>
                </div>
              )}
            </SectionCard>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard>
            <SectionHeader icon={Link2} title="Relations" tone="blue" />
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-foreground flex flex-col gap-2 text-sm font-medium">
                  <span>Source card</span>
                  <select
                    className="border-input bg-background text-foreground focus-visible:ring-ring h-9 rounded-md border px-3 text-sm shadow-sm outline-none focus-visible:ring-2"
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
                <label className="text-foreground flex flex-col gap-2 text-sm font-medium">
                  <span>Relation type</span>
                  <select
                    className="border-input bg-background text-foreground focus-visible:ring-ring h-9 rounded-md border px-3 text-sm shadow-sm outline-none focus-visible:ring-2"
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
                <label className="text-foreground flex flex-col gap-2 text-sm font-medium">
                  <span>Target card</span>
                  <select
                    className="border-input bg-background text-foreground focus-visible:ring-ring h-9 rounded-md border px-3 text-sm shadow-sm outline-none focus-visible:ring-2"
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
                <div className="flex items-end">
                  <Button
                    className="w-full"
                    type="button"
                    onClick={handleCreateRelation}
                    disabled={!canCreateRelation || pending}
                  >
                    <Link2 size={15} className="mr-2" /> Thêm relation
                  </Button>
                </div>
              </div>
              {relationRows.length > 0 ? (
                <div className="border-border overflow-x-auto rounded-lg border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-border bg-muted/40 border-b">
                        <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                          Source
                        </th>
                        <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                          Type
                        </th>
                        <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                          Target
                        </th>
                        <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                          Action
                        </th>
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
                <div className="border-border bg-muted/30 rounded-lg border border-dashed p-6 text-center">
                  <h3 className="text-foreground font-semibold">
                    Chưa có relation
                  </h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Thêm quan hệ giữa các typed cards để làm rõ cấu trúc.
                  </p>
                </div>
              )}
            </CardContent>
          </SectionCard>

          <SectionCard>
            <SectionHeader
              icon={History}
              title="Status history"
              tone="neutral"
            />
            <CardContent className="pt-0">
              {graph && graph.statusHistory.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {graph.statusHistory
                    .slice()
                    .reverse()
                    .map((change) => {
                      const node = graph.nodes.find(
                        (candidate) => candidate.id === change.nodeId
                      );
                      return (
                        <div
                          className="border-border bg-card rounded-lg border p-4"
                          key={change.id}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <strong className="text-foreground text-sm font-semibold">
                              {node?.title ?? change.nodeId}
                            </strong>
                            <Badge variant="secondary" className="text-xs">
                              {change.actor} · {change.authority}
                            </Badge>
                          </div>
                          <p className="text-foreground mt-2 text-sm">
                            {change.fromStatus ?? "—"} → {change.toStatus}
                          </p>
                          <p className="text-muted-foreground mt-2 text-xs">
                            {change.reason}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {change.occurredAt}
                          </p>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="border-border bg-muted/30 rounded-lg border border-dashed p-6 text-center">
                  <h3 className="text-foreground font-semibold">
                    Chưa có status history
                  </h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Lịch sử sẽ xuất hiện sau generate hoặc review status.
                  </p>
                </div>
              )}
            </CardContent>
          </SectionCard>
        </div>

        <SectionCard>
          <CardContent className="pt-0">
            <div className="text-foreground flex items-center gap-3 text-sm font-semibold">
              <span
                className="flex size-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600"
                aria-hidden="true"
              >
                <FileText size={18} />
              </span>
              <span>Step 2 review</span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                {getLocalDevelopmentLabel(fixtureMode) ?? "API-backed mode"}
              </span>
              <StatusPill status={graph ? "AVAILABLE" : "MISSING"} />
            </div>
            <div className="text-muted-foreground mt-4 text-sm">
              <strong>Next boundary:</strong> Step 3 literature/evidence
              contract, không thuộc UI refresh này.
            </div>
          </CardContent>
        </SectionCard>
      </div>
    </AppShell>
  );
}
