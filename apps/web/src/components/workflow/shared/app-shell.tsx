"use client";

import Link from "next/link";
import {
  CircleHelp,
  FileText,
  Folder,
  Home,
  History,
  Infinity,
  PanelRightClose,
  PanelRightOpen,
  Search,
  ShieldCheck,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type {
  PanelImperativeHandle,
  PanelSize,
} from "react-resizable-panels";
import type { LucideIcon } from "lucide-react";

import { LocalDevelopmentBadge, StatusPill } from "./section-card";
import { LOCAL_PROJECT } from "./local-fixtures";
import { StepBreadcrumb } from "./step-breadcrumb";
import { calculateStep2Readiness } from "../step2/step2-model";
import {
  buildWorkflowProgress,
  type ActiveStep,
  type WorkflowFacts,
} from "./workflow-progress";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { trpc } from "@/lib/trpc";

function HeaderNavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      className={cn(
        "relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "text-primary hover:bg-primary/5"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
      href={href}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={16} aria-hidden="true" />
      {label}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-2 -bottom-[9px] h-0.5 rounded-full",
          active ? "bg-primary" : "bg-transparent"
        )}
      />
    </Link>
  );
}

const SIDEBAR_DEFAULT_WIDTH = 380;
const SIDEBAR_MIN_WIDTH = 280;
const SIDEBAR_MAX_WIDTH = 520;
const SIDEBAR_COLLAPSED_WIDTH = 56;

function useIsLargeViewport() {
  const [isLargeViewport, setIsLargeViewport] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLargeViewport(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isLargeViewport;
}

export function AppShell({
  children,
  activeStep,
  projectId,
  fixtureMode,
}: {
  children: ReactNode;
  activeStep: ActiveStep;
  projectId?: string;
  fixtureMode?: boolean;
}) {
  const sidebarPanelRef = useRef<PanelImperativeHandle | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isLargeViewport = useIsLargeViewport();
  const pathname = usePathname();
  const isNavActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href) === true;
  const factsEnabled = Boolean(projectId) && !fixtureMode;
  const needsResearchFacts = factsEnabled && (activeStep === 3 || activeStep === 4);
  const projectQuery = trpc.projects.byId.useQuery(
    { id: projectId ?? "" },
    {
      enabled: factsEnabled,
      retry: false,
    }
  );
  const interpretationQuery = trpc.interpretation.latest.useQuery(
    { projectId: projectId ?? "" },
    { enabled: factsEnabled, retry: false }
  );
  const graphQuery = trpc.decomposition.byProject.useQuery(
    { projectId: projectId ?? "" },
    { enabled: factsEnabled, retry: false }
  );
  const selectedSourceQuery = trpc.literature.selectedCount.useQuery(
    { projectId: projectId ?? "" },
    { enabled: needsResearchFacts, retry: false }
  );
  const gapQuery = trpc.researchDesign.gapProposal.useQuery(
    { projectId: projectId ?? "" },
    { enabled: needsResearchFacts, retry: false }
  );
  const claimQuery = trpc.researchDesign.listClaims.useQuery(
    { projectId: projectId ?? "" },
    { enabled: needsResearchFacts, retry: false }
  );
  const planQuery = trpc.researchDesign.listPlans.useQuery(
    { projectId: projectId ?? "" },
    { enabled: needsResearchFacts, retry: false }
  );
  const resolvedProjectTitle = fixtureMode
    ? projectId === LOCAL_PROJECT.id
      ? LOCAL_PROJECT.title
      : undefined
    : projectQuery.data?.title;
  const projectLabel =
    resolvedProjectTitle ??
    (projectId
      ? projectQuery.error
        ? "Không đọc được project"
        : "Đang tải project…"
      : "Chưa chọn project");
  const graph = graphQuery.data ?? null;
  const readiness = graph ? calculateStep2Readiness(graph) : null;
  const progressFacts: WorkflowFacts = fixtureMode
    ? {
        interpretationStatus: "USER_CONFIRMED",
        decompositionGenerated: true,
        decompositionReady: true,
        selectedSourceCount: 1,
        gapCount: 1,
        claimCount: 1,
        experimentPlanCount: 1,
        feasibilityEstimateCount: 1,
      }
    : {
        interpretationStatus: interpretationQuery.data?.status ?? null,
        decompositionGenerated: Boolean(graph),
        decompositionReady: readiness?.ready === true,
        selectedSourceCount: selectedSourceQuery.data?.count,
        gapCount: gapQuery.data?.candidates.length ?? 0,
        claimCount: claimQuery.data?.items.length ?? 0,
        experimentPlanCount: planQuery.data?.items.length ?? 0,
        feasibilityEstimateCount:
          planQuery.data?.items.filter((plan) => plan.estimates.length > 0)
            .length ?? 0,
      };
  const progress = buildWorkflowProgress(activeStep, progressFacts, {
    newProject: !projectId,
  });
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

  const handleSidebarResize = (size: PanelSize) => {
    setSidebarCollapsed(size.inPixels < SIDEBAR_MIN_WIDTH);
  };

  const closeSidebar = () => {
    sidebarPanelRef.current?.collapse();
  };

  const openSidebar = () => {
    const panel = sidebarPanelRef.current;
    if (!panel) {
      return;
    }

    if (panel.isCollapsed()) {
      panel.expand();
    }
    panel.resize(SIDEBAR_DEFAULT_WIDTH);
  };

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[color-mix(in_oklch,var(--background),var(--primary)_2%)]">
      <header className="shrink-0 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-8 px-6">
          <Link
            className="flex items-center gap-2.5"
            href="/"
            aria-label="SpecResearch Loop"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground" aria-hidden="true">
              <Infinity size={20} />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-foreground">SpecResearch Loop</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Điều hướng chính">
            <HeaderNavLink href="/" label="Trang chủ" icon={Home} active={isNavActive("/")} />
            <HeaderNavLink href="/projects" label="Dự án" icon={Folder} active={isNavActive("/projects")} />
            <HeaderNavLink href="/history" label="Lịch sử phiên bản" icon={History} active={isNavActive("/history")} />
            <HeaderNavLink href="/help" label="Trợ giúp" icon={CircleHelp} active={isNavActive("/help")} />
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {fixtureMode ? <LocalDevelopmentBadge /> : null}
            <span className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Demo user">
              Demo user
            </span>
          </div>
        </div>
      </header>

      <ResizablePanelGroup className="mx-auto w-full max-w-[1600px] flex-1 overflow-hidden">
        <ResizablePanel id="workflow-main" className="min-h-0 min-w-0">
          <main className="h-full overflow-y-auto px-6 py-8">
            {children}
          </main>
        </ResizablePanel>

        {projectId && isLargeViewport ? (
          <>
            <ResizableHandle
              className={cn(
                "group w-2 bg-transparent",
                "after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-border after:transition-colors",
                "hover:bg-primary/10 data-[separator=active]:bg-primary/15",
                "hover:after:bg-primary/60 focus-visible:after:bg-primary data-[separator=hover]:after:bg-primary/60 data-[separator=active]:after:bg-primary"
              )}
              aria-label="Điều chỉnh độ rộng bảng tiến trình"
              title="Kéo để thay đổi độ rộng bảng tiến trình"
            />

            <ResizablePanel
              id="workflow-sidebar-panel"
              collapsible
              collapsedSize={SIDEBAR_COLLAPSED_WIDTH}
              defaultSize={SIDEBAR_DEFAULT_WIDTH}
              minSize={SIDEBAR_MIN_WIDTH}
              maxSize={SIDEBAR_MAX_WIDTH}
              groupResizeBehavior="preserve-pixel-size"
              panelRef={sidebarPanelRef}
              onResize={handleSidebarResize}
              className="min-h-0"
            >
              <aside
                id="workflow-sidebar"
                aria-label="Trạng thái project"
                className="flex h-full min-h-0 flex-col overflow-hidden bg-card"
              >
                {sidebarCollapsed ? (
                  <div className="flex h-full items-start justify-center p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:bg-accent hover:text-foreground"
                      onClick={openSidebar}
                      aria-label="Mở bảng tiến trình"
                      title="Mở bảng tiến trình"
                      aria-controls="workflow-sidebar"
                      aria-expanded={false}
                    >
                      <PanelRightOpen size={17} />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex shrink-0 items-center gap-3 border-b border-border p-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground hover:bg-accent hover:text-foreground"
                        onClick={closeSidebar}
                        aria-label="Thu gọn bảng tiến trình"
                        title="Thu gọn bảng tiến trình"
                        aria-controls="workflow-sidebar"
                        aria-expanded="true"
                      >
                        <PanelRightClose size={17} />
                      </Button>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PROJECT WORKFLOW</p>
                        <h2 className="text-base font-bold text-foreground">Bản đặc tả hiện tại</h2>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                      <div className="p-4">
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
                        <StepBreadcrumb steps={progress.steps} title={progress.title} />
                      </div>

                      <div className="p-4 border-t border-border">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API STATUS</p>
                        {progressFacts.interpretationStatus ? (
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-sm text-foreground">Interpretation</span>
                            <StatusPill status={progressFacts.interpretationStatus} />
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-3">Chưa có interpretation record.</p>
                        )}
                        {progressFacts.decompositionReady ? (
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
                          <Search size={15} /> Step 2 · Structured decomposition
                        </Link>
                        <Link
                          className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors", activeStep === 3 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                          href={researchHref}
                        >
                          <CircleHelp size={15} /> Steps 3–8 · Evidence → feasibility
                        </Link>
                        <Link
                          className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors", activeStep === 4 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                          href={finalReviewHref}
                        >
                          <ShieldCheck size={15} /> Steps 9–10 · Spec review & finalize
                        </Link>
                      </div>

                      {fixtureMode ? (
                        <p className="p-4 text-xs text-amber-700 bg-amber-500/10 border-t border-amber-500/20 dark:text-amber-300">
                          Fixture mode không ghi production data và không đại diện cho live
                          LLM, PostgreSQL hay literature results.
                        </p>
                      ) : null}
                    </div>
                  </>
                )}
              </aside>
            </ResizablePanel>
          </>
        ) : null}
      </ResizablePanelGroup>
    </div>
  );
}
