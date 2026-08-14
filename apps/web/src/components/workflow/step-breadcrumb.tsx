import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowStep = {
  label: string;
  state: "complete" | "current" | "blocked" | "pending";
};

export function StepBreadcrumb({ steps }: { steps: WorkflowStep[] }) {
  return (
    <ol className={cn("flex items-start gap-2")} aria-label="Tiến trình nghiên cứu">
      {steps.map((step, index) => (
        <li key={step.label} className={cn("flex flex-col items-center")}>
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
              step.state === "complete" && "border-emerald-500 bg-emerald-500 text-white",
              step.state === "current" && "border-primary bg-primary/10 text-primary",
              step.state === "pending" && "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400",
              step.state === "blocked" && "border-border bg-background text-muted-foreground"
            )}
            aria-current={step.state === "current" ? "step" : undefined}
          >
            {step.state === "complete" ? <Check className="size-4" /> : index + 1}
          </div>
          <span
            className={cn(
              "mt-1 text-xs",
              step.state === "complete" && "font-medium text-foreground",
              step.state === "current" && "font-semibold text-primary",
              step.state === "pending" && "font-medium text-amber-600 dark:text-amber-400",
              step.state === "blocked" && "text-muted-foreground"
            )}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "mx-2 h-0.5 flex-1 rounded-full transition-colors",
                step.state === "complete" ? "bg-emerald-500" : "bg-border"
              )}
              aria-hidden="true"
            />
          )}
        </li>
      ))}
    </ol>
  );
}
