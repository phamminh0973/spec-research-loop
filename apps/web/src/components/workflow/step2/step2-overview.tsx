"use client";

import {
  PersistedNodeStatusSchema,
  type SpecGraphView,
  SpecNodeTypeSchema,
  STEP2_REQUIRED_NODE_TYPES,
} from "@specloop/schemas";
import { Search, Sparkles } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { LocalDevelopmentBadge, SectionCard } from "../shared/section-card";
import {
  buildStep2Coverage,
  calculateStep2Readiness,
  type Step2NodeFilters,
} from "./step2-model";

export type Step2OverviewProps = {
  graph: SpecGraphView | null;
  fixtureMode: boolean;
  pending: boolean;
  filters: Step2NodeFilters;
  onFiltersChange: (filters: Step2NodeFilters) => void;
  onGenerate: () => void;
};

function typeLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function Metrics({ graph }: { graph: SpecGraphView | null }) {
  const unresolvedStatuses = new Set([
    "NEEDS_REVIEW",
    "MISSING",
    "AMBIGUOUS",
    "UNSUPPORTED",
    "CONFLICT",
  ]);
  const nodeCount = graph?.nodes.length ?? 0;
  const unresolvedCount =
    graph?.nodes.filter((node) => unresolvedStatuses.has(node.status)).length ??
    0;
  const warningCount = graph?.warnings.length ?? 0;
  const relationCount = graph?.relations.length ?? 0;

  return (
    <ul
      className="grid grid-cols-2 gap-3 md:grid-cols-4 list-none p-0 m-0"
      aria-label="Decomposition summary"
    >
      {[
        [nodeCount, "typed nodes"],
        [unresolvedCount, "unresolved cards"],
        [warningCount, "warnings"],
        [relationCount, "relations"],
      ].map(([value, label]) => (
        <li className="bg-muted rounded-lg p-4 text-center" key={label}>
          <span className="text-foreground text-2xl font-bold">{value}</span>
          <span className="text-muted-foreground block text-sm">{label}</span>
        </li>
      ))}
    </ul>
  );
}

export function Step2Overview({
  graph,
  fixtureMode,
  pending,
  filters,
  onFiltersChange,
  onGenerate,
}: Step2OverviewProps) {
  const coverage = graph ? buildStep2Coverage(graph) : [];
  const readiness = graph ? calculateStep2Readiness(graph) : null;

  return (
    <>
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
          <p className="text-muted-foreground mt-1 max-w-3xl">
            Chuyển interpretation đã xác nhận thành typed cards có thể review và
            chỉnh sửa. Literature, source provenance và novelty assessment không
            được suy diễn ở màn hình này.
          </p>
        </div>
      </div>

      {fixtureMode ? (
        <Alert
          className="mb-6 border-amber-200 bg-amber-50 text-amber-800"
          role="status"
        >
          <div className="flex flex-wrap items-center gap-2">
            <LocalDevelopmentBadge />
            <span>
              Fixture chỉ mô phỏng typed decomposition; không có paper,
              citation, source evidence hoặc novelty claim production.
            </span>
          </div>
        </Alert>
      ) : null}

      <SectionCard>
        <CardContent className="space-y-5 pt-0">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Yêu cầu xác nhận
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                System chỉ tạo card sau khi interpretation được xác nhận.
              </p>
            </div>
            <Button onClick={onGenerate} disabled={pending}>
              <Sparkles size={15} className="mr-2" />
              {pending
                ? "Đang xử lý…"
                : graph
                  ? "Generate lại cards"
                  : "Generate typed cards"}
            </Button>
          </div>
          <Metrics graph={graph} />
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-foreground text-sm font-semibold">
                Required Step 2 coverage
              </h2>
              {readiness ? (
                <Badge variant={readiness.ready ? "default" : "outline"}>
                  {readiness.ready ? "READY" : "NEEDS REVIEW"}
                </Badge>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STEP2_REQUIRED_NODE_TYPES.map((type) => {
                const item = coverage.find(
                  (candidate) => candidate.type === type
                );
                const present = item?.state === "PRESENT";
                return (
                  <div
                    key={type}
                    className={`rounded-lg border p-3 text-xs ${
                      present
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    <span className="font-semibold uppercase">
                      {typeLabel(type)}
                    </span>
                    <span className="mt-1 block">
                      {item?.count ?? 0} card(s)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-foreground flex flex-col gap-2 text-sm font-medium">
              <span>Filter by type</span>
              <select
                className="border-input bg-background h-10 rounded-md border px-3 text-sm"
                value={filters.type}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    type: event.target.value as Step2NodeFilters["type"],
                  })
                }
              >
                <option value="ALL">All types</option>
                {SpecNodeTypeSchema.options.map((type) => (
                  <option key={type} value={type}>
                    {typeLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-foreground flex flex-col gap-2 text-sm font-medium">
              <span>Filter by status</span>
              <select
                className="border-input bg-background h-10 rounded-md border px-3 text-sm"
                value={filters.status}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    status: event.target.value as Step2NodeFilters["status"],
                  })
                }
              >
                <option value="ALL">All statuses</option>
                {PersistedNodeStatusSchema.options.map((status) => (
                  <option key={status} value={status}>
                    {typeLabel(status)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </CardContent>
      </SectionCard>
    </>
  );
}
