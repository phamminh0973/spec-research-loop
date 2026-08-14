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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function errorMessage(error: { message?: string } | null | undefined) {
  return error?.message ?? "Step 2 operation failed.";
}

function typeLabel(type: SpecNode["type"]) {
  return type.replaceAll("_", " ");
}

function PageHeading() {
  return (
    <div className="flex items-start gap-4 mb-8">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
        <Search size={27} />
      </span>
      <div>
        <h1 className="text-2xl font-bold text-foreground">2. Structured decomposition</h1>
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-label="Decomposition summary">
      <div className="rounded-lg bg-muted p-4 text-center">
        <span className="text-2xl font-bold text-foreground">{nodeCount}</span>
        <span className="block text-sm text-muted-foreground">typed nodes</span>
      </div>
      <div className="rounded-lg bg-muted p-4 text-center">
        <span className="text-2xl font-bold text-foreground">{reviewCount}</span>
        <span className="block text-sm text-muted-foreground">needs review</span>
      </div>
      <div className="rounded-lg bg-muted p-4 text-center">
        <span className="text-2xl font-bold text-foreground">{warningCount}</span>
        <span className="block text-sm text-muted-foreground">warnings</span>
      </div>
      <div className="rounded-lg bg-muted p-4 text-center">
        <span className="text-2xl font-bold text-foreground">{sourceCount}</span>
        <span className="block text-sm text-muted-foreground">source refs</span>
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
    <tr className="border-b border-border">
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
            <p className="font-medium text-foreground">{row.title}</p>
            <Badge variant="secondary" className="text-xs mt-1">
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
      <td className="py-4 max-w-md">
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
            <p className="text-sm text-foreground">{row.content}</p>
            {row.reason ? (
              <p className="text-xs text-muted-foreground">Reason: {row.reason}</p>
            ) : null}
          </div>
        )}
      </td>
      <td className="py-4">
        <div className="space-y-1">
          <StatusPill status={row.status} />
          <p className="text-xs text-muted-foreground">{row.sourceCount} source ref(s)</p>
        </div>
      </td>
      <td className="py-4">
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button
                size="sm"
                onClick={onSave}
                disabled={pending}
              >
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
                <Button
                  size="sm"
                  onClick={onConfirm}
                  disabled={pending}
                >
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
      <div className="space-y-8">
        <PageHeading />

        {fixtureMode ? (
          <Alert className="bg-amber-50 border-amber-200 text-amber-800" role="status">
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
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive" role="alert">
            <div className="flex items-start gap-2">
              <ShieldAlert size={17} className="shrink-0 mt-0.5" />
              <span>
                <strong>API-backed Step 2 chưa khả dụng</strong>
                {errorMessage(error)}. HTTP context hiện chưa compose production
                <code className="bg-muted px-1 rounded">SpecStructureModule</code>; không tự chuyển sang fixture.
              </span>
            </div>
          </Alert>
        ) : null}

        <SectionCard>
          <CardContent className="pt-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">BR-01 GATE</p>
                <p className="text-sm text-muted-foreground">
                  Server chỉ nhận <code className="bg-muted px-1 rounded">projectId</code> và tự đọc interpretation
                  USER_CONFIRMED trước khi generate.
                </p>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={pending}
              >
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
          <div className="lg:col-span-2 space-y-4">
            <SectionCard>
              <SectionHeader icon={FileText} title="Review plan" tone="blue" />
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-current" />
                  Kiểm tra type, status, reason và source refs của từng card.
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-current" />
                  Chỉnh sửa nội dung bằng mutation có validation ở API.
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-current" />
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
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <h3 className="font-semibold text-foreground mb-2">Step 3 boundary</h3>
                <p className="text-sm text-muted-foreground">
                  Search plan, priority sources và related-work provenance chưa
                  có contract Step 2. <code className="bg-muted px-1 rounded">search_arxiv</code> không phải generator của
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Card</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Content / reason</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review</th>
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
              <p className="text-center text-muted-foreground py-8">Đang đọc graph view…</p>
            ) : (
              <div className="text-center py-8">
                <h3 className="font-semibold text-foreground mb-1">Chưa có typed cards</h3>
                <p className="text-sm text-muted-foreground">
                  Chỉ generate sau khi server xác nhận BR-01, hoặc mở
                  <code className="bg-muted px-1 rounded">?fixture=1</code> để smoke-test local.
                </p>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
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
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      <h3 className="font-semibold text-foreground">{gap.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{gap.content}</p>
                      <div className="mt-3">
                        <StatusPill status={gap.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Đây chỉ là candidate trong decomposition; cần
                        corpus-bounded evidence trước mọi kết luận.
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <h3 className="font-semibold text-foreground mb-1">Chưa có GAP node</h3>
                  <p className="text-sm text-muted-foreground">Không tạo gap giả để lấp giao diện.</p>
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
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      <strong className="text-foreground">
                        {warning.code} · {warning.targetType}
                      </strong>
                      <p className="text-sm text-muted-foreground mt-1">{warning.reason}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Action: {warning.suggestedAction}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8">
                  <h3 className="font-semibold text-foreground mb-1">Chưa có warnings</h3>
                  <p className="text-sm text-muted-foreground">Warnings sẽ xuất hiện từ graph output đã validate.</p>
                </div>
              )}
            </SectionCard>
          </div>
        </div>

        <SectionCard>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3 text-sm font-semibold text-foreground">
              <span className="flex size-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600" aria-hidden="true">
                <FileText size={18} />
              </span>
              <span>Step 2 review</span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {getLocalDevelopmentLabel(fixtureMode) ?? "API-backed mode"}
              </span>
              <StatusPill status={graph ? "AVAILABLE" : "MISSING"} />
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <strong>Next boundary:</strong> Step 3 literature/evidence contract,
              không thuộc UI refresh này.
            </div>
          </CardContent>
        </SectionCard>
      </div>
    </AppShell>
  );
}
