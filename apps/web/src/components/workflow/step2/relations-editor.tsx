"use client";

import type { SpecGraphView, SpecRelationType } from "@specloop/schemas";
import { Link2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { SectionCard, SectionHeader } from "../section-card";
import type { RelationReviewRow } from "../workflow-model";

export type RelationDraft = {
  sourceClientRef: string;
  targetClientRef: string;
  type: SpecRelationType;
};

export const RELATION_TYPES: readonly SpecRelationType[] = [
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

export type RelationsEditorProps = {
  graph: SpecGraphView | null;
  rows: readonly RelationReviewRow[];
  draft: RelationDraft;
  sourceValue: string;
  targetValue: string;
  canCreate: boolean;
  pending: boolean;
  error: string | null;
  onDraftChange: (draft: RelationDraft) => void;
  onCreate: () => void;
  onDelete: (relationId: string) => void;
};

function typeLabel(type: string): string {
  return type.replaceAll("_", " ");
}

export function RelationsEditor({
  graph,
  rows,
  draft,
  sourceValue,
  targetValue,
  canCreate,
  pending,
  error,
  onDraftChange,
  onCreate,
  onDelete,
}: RelationsEditorProps) {
  return (
    <SectionCard>
      <SectionHeader icon={Link2} title="Relations" tone="blue" />
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive" role="alert">
            {error}
          </Alert>
        ) : null}
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-foreground flex flex-col gap-2 text-sm font-medium">
            <span>Source card</span>
            <select
              className="border-input bg-background h-10 rounded-md border px-3 text-sm"
              value={sourceValue}
              onChange={(event) =>
                onDraftChange({ ...draft, sourceClientRef: event.target.value })
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
              className="border-input bg-background h-10 rounded-md border px-3 text-sm"
              value={draft.type}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  type: event.target.value as SpecRelationType,
                })
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
              className="border-input bg-background h-10 rounded-md border px-3 text-sm"
              value={targetValue}
              onChange={(event) =>
                onDraftChange({ ...draft, targetClientRef: event.target.value })
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
        </div>
        <Button
          className="w-full sm:w-auto"
          type="button"
          onClick={onCreate}
          disabled={!canCreate || pending}
        >
          <Link2 size={15} className="mr-2" /> Thêm relation
        </Button>
        {rows.length > 0 ? (
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                className="border-border flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                key={row.id}
              >
                <div className="min-w-0">
                  <p className="text-foreground font-medium">
                    {row.sourceTitle} → {row.targetTitle}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{row.sourceClientRef}</Badge>
                    <Badge variant="outline">{typeLabel(row.type)}</Badge>
                    <Badge variant="secondary">{row.targetClientRef}</Badge>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  type="button"
                  onClick={() => onDelete(row.id)}
                  disabled={pending}
                  aria-label={`Delete relation ${row.sourceClientRef} ${row.type} ${row.targetClientRef}`}
                >
                  <Trash2 size={13} className="mr-1" /> Xoá
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-border bg-muted/30 rounded-lg border border-dashed p-6 text-center">
            <h3 className="text-foreground font-semibold">Chưa có relation</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Thêm quan hệ giữa các typed cards để làm rõ cấu trúc.
            </p>
          </div>
        )}
      </CardContent>
    </SectionCard>
  );
}
