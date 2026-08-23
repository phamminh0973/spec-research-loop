import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { WorkflowStep, WorkflowStepState } from "./workflow-progress";

export type { WorkflowStep } from "./workflow-progress";

function stateLabel(state: WorkflowStepState) {
  if (state === "complete") return "đã hoàn tất";
  if (state === "current") return "đang thực hiện";
  if (state === "pending") return "chưa bắt đầu";
  return "đang bị chặn";
}

export function StepBreadcrumb({
  steps,
  title = "Tiến độ màn hình hiện tại",
}: {
  steps: WorkflowStep[];
  title?: string;
}) {
  const completedCount = steps.filter((step) => step.state === "complete").length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <span className="shrink-0 text-xs text-muted-foreground">
          {completedCount}/{steps.length}
        </span>
      </div>

      <ol
        className="flex w-full items-start"
        aria-label={`${title}: ${completedCount}/${steps.length} tiểu bước đã hoàn tất`}
      >
        {steps.map((step, index) => {
          const isDone = step.state === "complete";
          const isCurrent = step.state === "current";
          const isLast = index === steps.length - 1;
          const connectorActive = isDone;

          return (
            <li
              key={step.id}
              className={cn(
                "flex min-w-0 flex-1 items-center",
                !isLast && "pr-2",
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                    isDone && "border-emerald-500 bg-emerald-500 text-white",
                    isCurrent && "border-primary bg-primary/10 text-primary",
                    step.state === "pending" &&
                      "border-border bg-background text-muted-foreground",
                    step.state === "blocked" &&
                      "border-dashed border-border bg-muted/40 text-muted-foreground",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`Bước ${index + 1}: ${step.label}, ${stateLabel(step.state)}`}
                >
                  {isDone ? <Check className="size-4" /> : index + 1}
                </div>
                <span
                  className={cn(
                    "min-w-0 truncate text-[11px] leading-4",
                    isDone && "font-medium text-foreground",
                    isCurrent && "font-semibold text-primary",
                    step.state === "pending" && "text-muted-foreground",
                    step.state === "blocked" && "text-muted-foreground/70",
                  )}
                  title={step.label}
                >
                  {step.label}
                </span>
              </div>

              {!isLast ? (
                <div
                  className={cn(
                    "mx-1 h-0.5 min-w-3 flex-1 rounded-full",
                    connectorActive ? "bg-emerald-500" : "bg-border",
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
