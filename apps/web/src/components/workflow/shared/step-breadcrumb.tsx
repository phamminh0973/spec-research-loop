import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { WorkflowStep, WorkflowStepState } from "./workflow-progress";

export type { WorkflowStep } from "./workflow-progress";

function stateLabel(state: WorkflowStepState) {
  if (state === "complete") return "đã hoàn tất";
  if (state === "current") return "đang thực hiện";
  if (state === "pending") return "sẵn sàng tiếp theo";
  return "đang bị chặn";
}

export function StepBreadcrumb({ steps }: { steps: WorkflowStep[] }) {
  return (
    <ol className="flex flex-col items-start" aria-label="Tiến trình nghiên cứu">
      {steps.map((step, index) => (
        <li key={step.id} className="flex flex-col items-start">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                step.state === "complete" &&
                  "border-emerald-500 bg-emerald-500 text-white",
                step.state === "current" &&
                  "border-primary bg-primary/10 text-primary",
                step.state === "pending" &&
                  "border-border bg-background text-muted-foreground",
                step.state === "blocked" &&
                  "border-dashed border-border bg-muted/40 text-muted-foreground"
              )}
              aria-current={step.state === "current" ? "step" : undefined}
              aria-label={`Bước ${step.id}: ${step.label}, ${stateLabel(step.state)}`}
            >
              {step.state === "complete" ? <Check className="size-4" /> : step.id}
            </div>
            <span
              className={cn(
                "text-xs",
                step.state === "complete" && "font-medium text-foreground",
                step.state === "current" && "font-semibold text-primary",
                step.state === "pending" && "text-muted-foreground",
                step.state === "blocked" && "text-muted-foreground/70"
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 ? (
            <div
              className={cn(
                "ml-[17px] h-3 w-px",
                step.state === "complete" ? "bg-emerald-500" : "bg-border"
              )}
              aria-hidden="true"
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
