"use client";

import Link from "next/link";
import {
  CircleHelp,
  FileText,
  Folder,
  History,
  Infinity,
  PanelRight,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";

import { LocalDevelopmentBadge, StatusPill } from "./section-card";
import { LOCAL_PROJECT } from "./local-fixtures";
import { StepBreadcrumb, type WorkflowStep } from "./step-breadcrumb";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

type ActiveStep = 1 | 2 | 3 | 4;

const stepLabels = [
  { label: "Ý tưởng", icon: FileText },
  { label: "Làm rõ & xác nhận", icon: Search },
  { label: "Structured cards", icon: Folder },
  { label: "Literature / evidence", icon: CircleHelp },
  { label: "Final review", icon: ShieldCheck },
];

function getWorkflowSteps(
  activeStep: ActiveStep,
  interpretationStatus: string | null,
  hasGraph: boolean
): WorkflowStep[] {
  const confirmed = interpretationStatus === "USER_CONFIRMED";
  return stepLabels.map((step, index) => {
    const stepNumber = index + 1;
    if (stepNumber === 1) return { label: step.label, state: activeStep === 1 ? "current" : "complete" };
    if (stepNumber === 2) return { label: step.label, state: confirmed ? (activeStep === 2 ? "current" : "complete") : "blocked" };
    if (stepNumber === 3) return { label: step.label, state: hasGraph ? (activeStep === 3 ? "current" : "complete") : "blocked" };
    return { label: step.label, state: hasGraph ? (activeStep === 4 ? "current" : "complete") : "blocked" };
  });
}

export function AppShell({
  children,
  activeStep,
  projectId,
  projectTitle,
  fixtureMode,
  interpretationStatus,
  hasGraph,
}: {
  children: ReactNode;
  activeStep: ActiveStep;
  projectId?: string;
  projectTitle?: string;
  fixtureMode?: boolean;
  interpretationStatus?: string | null;
  hasGraph?: boolean;
}) {
  const projectQuery = trpc.projects.byId.useQuery(
    { id: projectId ?? "" },
    {
      enabled: Boolean(projectId && !projectTitle && !fixtureMode),
      retry: false,
    }
  );
  const resolvedProjectTitle =
    projectTitle ??
    (fixtureMode && projectId === LOCAL_PROJECT.id
      ? LOCAL_PROJECT.title
      : projectQuery.data?.title);
  const projectLabel =
    resolvedProjectTitle ??
    (projectId
      ? projectQuery.error
        ? "Không đọc được project"
        : "Đang tải project…"
      : "Chưa chọn project");
  const steps = getWorkflowSteps(
    activeStep,
    interpretationStatus ?? null,
    hasGraph ?? false
  );
  const understandingHref = projectId
    ? `/projects/${projectId}/understanding${fixtureMode ? "?fixture=1" : ""}`
    : "/projects/new";
  const decompositionHref = projectId
    ? `/projects/${projectId}/decomposition${fixtureMode ? "?fixture=1" : ""}`
    : "/projects/new";
  const researchHref = projectId
    ? `/projects/${projectId}/research${fixtureMode ? "?fixture=1" : ""}`
    : "/projects/new";
  const finalReviewHref = projectId
    ? `/projects/${projectId}/final-review${fixtureMode ? "?fixture=1" : ""}`
    : "/projects/new";

  return (
    <div className="min-h-screen bg-[color-mix(in_oklch,var(--background),var(--primary)_2%)]">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-8 px-6">
          <Link
            className="flex items-center gap-2.5"
            href="/projects/new"
            aria-label="SpecResearch Loop"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground" aria-hidden="true">
              <Infinity size={20} />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-foreground">SpecResearch Loop</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Điều hướng chính">
            <Link className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-primary" href="/projects/new">
              <Folder size={16} /> Dự án
            </Link>
            <span className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground" aria-disabled="true">
              <History size={16} /> Lịch sử phiên bản
            </span>
            <span className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground" aria-disabled="true">
              <CircleHelp size={16} /> Trợ giúp
            </span>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {fixtureMode ? <LocalDevelopmentBadge /> : null}
            <span className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Demo user">
              Demo user
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <main className="flex-1 min-w-0 px-6 py-8">{children}</main>

        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 border-l border-border lg:block w-95 bg-card" aria-label="Trạng thái project">
          <div className="flex items-center gap-3 p-4">
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden="true">
              <PanelRight size={17} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PROJECT WORKFLOW</p>
              <h2 className="text-base font-bold text-foreground">Bản đặc tả hiện tại</h2>
            </div>
          </div>

          <div className="p-4 border-t border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PROJECT</p>
            <p className="text-base font-medium text-foreground mt-1">
              {projectLabel}
            </p>
            {projectId ? (
              <code className="text-xs text-muted-foreground mt-1 block font-mono">{projectId}</code>
            ) : (
              <span className="text-xs text-muted-foreground mt-1 block">Chưa tạo project</span>
            )}
          </div>

          <div className="p-4 border-t border-border">
            <StepBreadcrumb steps={steps} />
          </div>

          <div className="p-4 border-t border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API STATUS</p>
            {interpretationStatus ? (
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm text-foreground">Interpretation</span>
                <StatusPill status={interpretationStatus} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-3">Chưa có interpretation record.</p>
            )}
            {hasGraph ? (
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm text-foreground">Decomposition</span>
                <StatusPill status="AVAILABLE" label="AVAILABLE" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-3">Chưa có graph view.</p>
            )}
          </div>

          <div className="p-4 border-t border-border flex flex-col gap-2">
            <Link
              className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors", activeStep === 1 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
              href={understandingHref}
            >
              <FileText size={15} /> Step 1 · Interpretation
            </Link>
            <Link
              className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors", activeStep === 2 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
              href={decompositionHref}
            >
              <Search size={15} /> Step 2 · Typed cards
            </Link>
            <Link
              className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors", activeStep === 3 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
              href={researchHref}
            >
              <CircleHelp size={15} /> Step 3–6 · Literature / evidence
            </Link>
            <Link
              className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors", activeStep === 4 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
              href={finalReviewHref}
            >
              <ShieldCheck size={15} /> Step 7–10 · Final review
            </Link>
          </div>

          {fixtureMode ? (
            <p className="p-4 text-xs text-amber-700 bg-amber-500/10 border-t border-amber-500/20 dark:text-amber-300">
              Fixture mode không ghi production data và không đại diện cho live
              LLM, PostgreSQL hay literature results.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
