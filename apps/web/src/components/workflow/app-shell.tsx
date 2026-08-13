import Link from "next/link";
import {
  CircleHelp,
  FileText,
  Folder,
  History,
  Infinity,
  PanelRight,
  Search,
} from "lucide-react";
import type { ReactNode } from "react";

import { LocalDevelopmentBadge, StatusPill } from "./section-card";
import { StepBreadcrumb, type WorkflowStep } from "./step-breadcrumb";

type ActiveStep = 1 | 2;

const stepLabels = [
  { label: "Ý tưởng", icon: FileText },
  { label: "Làm rõ & xác nhận", icon: Search },
  { label: "Structured cards", icon: Folder },
  { label: "Literature / evidence", icon: CircleHelp },
];

function getWorkflowSteps(
  activeStep: ActiveStep,
  interpretationStatus: string | null,
  hasGraph: boolean
): WorkflowStep[] {
  const confirmed = interpretationStatus === "USER_CONFIRMED";
  return stepLabels.map((step, index) => {
    if (index === 0) {
      return {
        label: step.label,
        state: activeStep === 1 ? "current" : "complete",
      };
    }
    if (index === 1) {
      return {
        label: step.label,
        state: confirmed
          ? activeStep === 1
            ? "current"
            : "complete"
          : "blocked",
      };
    }
    if (index === 2) {
      return {
        label: step.label,
        state: hasGraph ? "complete" : activeStep === 2 ? "current" : "blocked",
      };
    }
    return { label: step.label, state: "blocked" };
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link
            className="brand"
            href="/projects/new"
            aria-label="SpecResearch Loop"
          >
            <span className="brand-mark" aria-hidden="true">
              <Infinity size={20} />
            </span>
            <span>SpecResearch Loop</span>
          </Link>

          <nav className="topnav" aria-label="Điều hướng chính">
            <Link className="topnav-link active" href="/projects/new">
              <Folder size={16} /> Dự án
            </Link>
            <span className="topnav-link muted" aria-disabled="true">
              <History size={16} /> Lịch sử phiên bản
            </span>
            <span className="topnav-link muted" aria-disabled="true">
              <CircleHelp size={16} /> Trợ giúp
            </span>
          </nav>

          <div className="topbar-actions">
            {fixtureMode ? <LocalDevelopmentBadge /> : null}
            <span className="account-chip" aria-label="Demo user">
              Demo user
            </span>
          </div>
        </div>
      </header>

      <div className="shell-layout">
        <main className="main-content">{children}</main>

        <aside className="status-rail" aria-label="Trạng thái project">
          <div className="rail-header">
            <span className="rail-icon" aria-hidden="true">
              <PanelRight size={17} />
            </span>
            <div>
              <p className="eyebrow">PROJECT WORKFLOW</p>
              <h2>Bản đặc tả hiện tại</h2>
            </div>
          </div>

          <div className="rail-project">
            <p className="eyebrow">PROJECT</p>
            <p className="rail-project-title">
              {projectTitle ?? "Chưa chọn project"}
            </p>
            {projectId ? (
              <code>{projectId}</code>
            ) : (
              <span>Chưa tạo project</span>
            )}
          </div>

          <StepBreadcrumb steps={steps} />

          <div className="rail-summary">
            <p className="eyebrow">API STATUS</p>
            {interpretationStatus ? (
              <div className="rail-status-row">
                <span>Interpretation</span>
                <StatusPill status={interpretationStatus} />
              </div>
            ) : (
              <p className="rail-muted">Chưa có interpretation record.</p>
            )}
            {hasGraph ? (
              <div className="rail-status-row">
                <span>Decomposition</span>
                <StatusPill status="AVAILABLE" label="AVAILABLE" />
              </div>
            ) : (
              <p className="rail-muted">Chưa có graph view.</p>
            )}
          </div>

          <div className="rail-actions">
            <Link
              className={`rail-link ${activeStep === 1 ? "selected" : ""}`}
              href={understandingHref}
            >
              <FileText size={15} /> Step 1 · Interpretation
            </Link>
            <Link
              className={`rail-link ${activeStep === 2 ? "selected" : ""}`}
              href={decompositionHref}
            >
              <Search size={15} /> Step 2 · Typed cards
            </Link>
          </div>

          {fixtureMode ? (
            <p className="rail-warning">
              Fixture mode không ghi production data và không đại diện cho live
              LLM, PostgreSQL hay literature results.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
