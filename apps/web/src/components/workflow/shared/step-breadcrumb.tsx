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
  title,
}: {
  steps: WorkflowStep[];
  title: string;
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-foreground">{title}</p>

      <ol
        className="flex flex-col items-start"
        aria-label={title}
      >
        {steps.map((step, index) => {
          const isDone = step.state === "complete";
          const isCurrent = step.state === "current";
          const isLast = index === steps.length - 1;

          return (
            <li key={step.id} className="flex items-start">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
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
                {!isLast ? (
                  <div
                    className={cn(
                      "h-5 w-px",
                      isDone ? "bg-emerald-500" : "bg-border",
                    )}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
              <span
                className={cn(
                  "min-w-0 pb-5 pl-3 pt-2 text-sm",
                  isDone && "font-medium text-foreground",
                  isCurrent && "font-semibold text-primary",
                  step.state === "pending" && "text-muted-foreground",
                  step.state === "blocked" && "text-muted-foreground/70",
                )}
                title={step.label}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
