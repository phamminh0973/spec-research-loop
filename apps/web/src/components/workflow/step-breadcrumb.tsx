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
              step.state === "complete" && "border-green-500 bg-green-500 text-white",
              step.state === "current" && "border-blue-500 bg-blue-50 text-blue-600",
              step.state === "pending" && "border-amber-500 bg-amber-50 text-amber-600",
              step.state === "blocked" && "border-slate-300 bg-white text-slate-400"
            )}
            aria-current={step.state === "current" ? "step" : undefined}
          >
            {step.state === "complete" ? <Check className="size-4" /> : index + 1}
          </div>
          <span
            className={cn(
              "mt-1 text-xs",
              step.state === "complete" && "font-medium text-slate-600",
              step.state === "current" && "font-semibold text-blue-600",
              step.state === "pending" && "font-medium text-amber-600",
              step.state === "blocked" && "text-slate-500"
            )}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "mx-2 h-0.5 flex-1 rounded-full transition-colors",
                step.state === "complete" ? "bg-green-500" : "bg-slate-200"
              )}
              aria-hidden="true"
            />
          )}
        </li>
      ))}
    </ol>
  );
}
