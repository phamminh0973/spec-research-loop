"use client";

import type { SpecGraphView } from "@specloop/schemas";
import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";
import { SectionCard, SectionHeader, StatusPill } from "../shared/section-card";
import { getGapCandidates } from "./step2-model";

export function WarningsPanel({ graph }: { graph: SpecGraphView | null }) {
  const gaps = graph ? getGapCandidates(graph) : [];
  const warnings = graph?.warnings ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard>
        <SectionHeader
          icon={AlertTriangle}
          title="Gap candidates"
          tone="amber"
        />
        <CardContent>
          {gaps.length > 0 ? (
            <div className="space-y-3">
              {gaps.map((gap) => (
                <div
                  key={gap.clientRef}
                  className="border-border bg-card rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-foreground font-semibold">
                      {gap.title}
                    </h3>
                    <StatusPill status={gap.status} />
                  </div>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    {gap.content}
                  </p>
                  <p className="text-muted-foreground mt-3 text-xs leading-5">
                    Đây chỉ là candidate trong decomposition; cần corpus-bounded
                    evidence trước mọi kết luận.
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <h3 className="text-foreground font-semibold">
                Chưa có GAP node
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Không tạo gap giả để lấp giao diện.
              </p>
            </div>
          )}
        </CardContent>
      </SectionCard>

      <SectionCard>
        <SectionHeader icon={AlertTriangle} title="Warnings" tone="amber" />
        <CardContent>
          {warnings.length > 0 ? (
            <ul className="space-y-3">
              {warnings.map((warning, index) => (
                <li
                  key={`${warning.code}-${warning.targetClientRef ?? index}`}
                  className="border-border bg-card rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-foreground">
                      {warning.code} · {warning.targetType}
                    </strong>
                    {warning.targetClientRef ? (
                      <Badge variant="secondary">
                        {warning.targetClientRef}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    {warning.reason}
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs leading-5">
                    Action: {warning.suggestedAction}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8 text-center">
              <h3 className="text-foreground font-semibold">
                Chưa có warnings
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Warnings sẽ xuất hiện từ graph output đã validate.
              </p>
            </div>
          )}
        </CardContent>
      </SectionCard>
    </div>
  );
}
