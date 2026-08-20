"use client";

import type { SpecGraphView } from "@specloop/schemas";
import { FileText } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

import { CardContent } from "@/components/ui/card";
import { SectionCard, StatusPill } from "../section-card";
import {
  calculateStep2Readiness,
  getLocalDevelopmentLabel,
} from "../workflow-model";

export function Step2Handoff({
  graph,
  fixtureMode,
}: {
  graph: SpecGraphView;
  fixtureMode: boolean;
}) {
  const readiness = graph ? calculateStep2Readiness(graph) : null;
  return (
    <SectionCard>
      <CardContent className="pt-0">
        <div className="text-foreground flex items-center gap-3 text-sm font-semibold">
          <span
            className="flex size-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600"
            aria-hidden="true"
          >
            <FileText size={18} />
          </span>
          <span>Step 2 review handoff</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-muted-foreground text-sm">
            {getLocalDevelopmentLabel(fixtureMode) ?? "API-backed mode"}
          </span>
          <StatusPill status={readiness?.ready ? "AVAILABLE" : "MISSING"} />
        </div>
        {readiness?.ready ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Step 2 đã đủ required cards và không còn unresolved status. Có thể
            chuyển sang literature/evidence của Step 3.
            <div className="mt-3">
              <Link href={`/projects/${graph.projectId}/research${fixtureMode ? "?fixture=1" : ""}`} className={buttonVariants({ size: "sm" })}>
                Mở Literature & Research Design
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Cần review trước khi handoff.</strong>
            {readiness ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {readiness.unresolvedRequiredTypes.map((type) => (
                  <li key={type}>Missing required type: {type}</li>
                ))}
                {readiness.unresolvedNodeRefs.map((clientRef) => (
                  <li key={clientRef}>Unresolved card: {clientRef}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1">Generate graph để bắt đầu review.</p>
            )}
          </div>
        )}
      </CardContent>
    </SectionCard>
  );
}
