"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "../shared/section-card";
import type { NodeReviewRow } from "./step2-model";

export type NodeDraft = {
  title: string;
  content: string;
  reason: string;
};

export type NodeReviewCardProps = {
  row: NodeReviewRow;
  editing: boolean;
  draft: NodeDraft;
  pending: boolean;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onConfirm: () => void;
  onReject: () => void;
  onDraftChange: (draft: NodeDraft) => void;
};

function typeLabel(type: NodeReviewRow["type"]): string {
  return type.replaceAll("_", " ");
}

export function NodeReviewCard({
  row,
  editing,
  draft,
  pending,
  onSave,
  onCancel,
  onEdit,
  onConfirm,
  onReject,
  onDraftChange,
}: NodeReviewCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="gap-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {editing ? (
              <Input
                value={draft.title}
                onChange={(event) =>
                  onDraftChange({ ...draft, title: event.target.value })
                }
                aria-label={`Title for ${row.clientRef}`}
              />
            ) : (
              <CardTitle className="text-base leading-6">{row.title}</CardTitle>
            )}
            <Badge variant="secondary" className="mt-2 text-xs">
              {row.clientRef}
            </Badge>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs uppercase">
            {typeLabel(row.type)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex h-[calc(100%-7.5rem)] flex-col gap-4 pt-0">
        {editing ? (
          <div className="space-y-3">
            <Textarea
              value={draft.content}
              onChange={(event) =>
                onDraftChange({ ...draft, content: event.target.value })
              }
              rows={5}
              aria-label={`Content for ${row.clientRef}`}
            />
            <Input
              value={draft.reason}
              onChange={(event) =>
                onDraftChange({ ...draft, reason: event.target.value })
              }
              placeholder="Reason (optional)"
              aria-label={`Reason for ${row.clientRef}`}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-foreground text-sm leading-6">{row.content}</p>
            {row.reason ? (
              <p className="text-muted-foreground text-xs leading-5">
                Reason: {row.reason}
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div className="space-y-1">
            <StatusPill status={row.status} />
            <p className="text-muted-foreground text-xs">
              {row.sourceCount} source ref(s)
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {editing ? (
              <>
                <Button size="sm" onClick={onSave} disabled={pending}>
                  Lưu
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
                  Sửa
                </Button>
                {row.status !== "USER_CONFIRMED" ? (
                  <Button size="sm" onClick={onConfirm} disabled={pending}>
                    Confirm
                  </Button>
                ) : null}
                {row.status !== "USER_REJECTED" ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onReject}
                    disabled={pending}
                  >
                    Reject
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
