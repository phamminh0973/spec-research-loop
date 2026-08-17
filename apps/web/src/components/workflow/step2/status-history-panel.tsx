"use client";

import type { SpecGraphView } from "@specloop/schemas";
import { History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";
import { SectionCard, SectionHeader } from "../section-card";

export function StatusHistoryPanel({ graph }: { graph: SpecGraphView | null }) {
  const history = graph
    ? [...graph.statusHistory].sort((left, right) =>
        right.occurredAt.localeCompare(left.occurredAt)
      )
    : [];

  return (
    <SectionCard>
      <SectionHeader icon={History} title="Status history" tone="neutral" />
      <CardContent className="pt-0">
        {history.length > 0 ? (
          <div className="flex flex-col gap-3">
            {history.map((change) => {
              const node = graph?.nodes.find(
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
  );
}
