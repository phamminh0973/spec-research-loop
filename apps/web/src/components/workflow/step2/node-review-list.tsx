"use client";

import { type NodeDraft, NodeReviewCard } from "./node-review-card";
import type { NodeReviewRow } from "./step2-model";

export type NodeReviewListProps = {
  rows: readonly NodeReviewRow[];
  editingRef: string | null;
  draft: NodeDraft;
  pending: boolean;
  loading: boolean;
  hasGraph: boolean;
  onSave: () => void;
  onCancel: () => void;
  onEdit: (row: NodeReviewRow) => void;
  onConfirm: (clientRef: string) => void;
  onReject: (clientRef: string) => void;
  onDraftChange: (draft: NodeDraft) => void;
};

export function NodeReviewList({
  rows,
  editingRef,
  draft,
  pending,
  loading,
  hasGraph,
  onSave,
  onCancel,
  onEdit,
  onConfirm,
  onReject,
  onDraftChange,
}: NodeReviewListProps) {
  if (loading) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
        Đang đọc graph view…
      </p>
    );
  }

  if (!hasGraph || rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <h3 className="text-foreground font-semibold">Chưa có typed cards</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Generate sau khi server xác nhận BR-01, hoặc mở fixture để smoke-test
          local.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map((row) => (
        <NodeReviewCard
          key={row.clientRef}
          row={row}
          editing={editingRef === row.clientRef}
          draft={draft}
          pending={pending}
          onSave={onSave}
          onCancel={onCancel}
          onEdit={() => onEdit(row)}
          onConfirm={() => onConfirm(row.clientRef)}
          onReject={() => onReject(row.clientRef)}
          onDraftChange={onDraftChange}
        />
      ))}
    </div>
  );
}
