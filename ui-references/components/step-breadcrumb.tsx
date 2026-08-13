import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type BreadcrumbStep = {
  label: string
}

export function StepBreadcrumb({
  currentStep,
  totalSteps,
  steps,
  className,
  variant = "default",
}: {
  currentStep: number
  totalSteps: number
  steps: BreadcrumbStep[]
  className?: string
  variant?: "default" | "overview"
}) {
  if (variant === "overview") {
    return (
      <ol className={cn("flex w-full items-start", className)} aria-label="Tiến trình nghiên cứu">
        {steps.slice(0, totalSteps).map((step, index) => {
          const stepNumber = index + 1
          const isDone = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          const isLast = index === Math.min(totalSteps, steps.length) - 1

          return (
            <li key={step.label} className={cn("flex min-w-0 flex-1 items-center", !isLast && "pr-4")}>
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold",
                    isDone && "border-emerald bg-emerald text-white",
                    isCurrent && "border-brand bg-brand text-brand-foreground shadow-[0_0_0_4px_var(--color-brand-muted)]",
                    !isDone && !isCurrent && "border-slate-300 bg-white text-slate-400",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isDone ? <Check className="size-4" /> : stepNumber}
                </div>
                <span
                  className={cn(
                    "truncate text-sm",
                    isDone && "font-medium text-slate-600",
                    isCurrent && "font-semibold text-brand",
                    !isDone && !isCurrent && "text-slate-500",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && <div className="ml-4 h-px min-w-4 flex-1 bg-slate-300" aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
    )
  }

  return (
    <ol className={cn("flex items-start", className)}>
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const isDone = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep
        const isLast = index === steps.length - 1
        const connectorActive = stepNumber < currentStep

        return (
          <li key={step.label} className={cn("flex flex-col items-center", !isLast && "flex-1")}>
            <div className="flex w-full items-center">
              {/* Node */}
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  isDone && "border-emerald bg-emerald text-white",
                  isCurrent && "border-purple bg-purple-soft text-purple",
                  !isDone && !isCurrent && "border-slate-300 bg-white text-slate-400",
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isDone ? <Check className="size-4" /> : stepNumber}
              </div>

              {/* Connector */}
              {!isLast && (
                <div
                  className={cn(
                    "mx-2 h-0.5 flex-1 rounded-full transition-colors",
                    connectorActive ? "bg-emerald" : isCurrent ? "bg-purple/40" : "bg-slate-200",
                  )}
                />
              )}
            </div>

            <span
              className={cn(
                "mt-2 text-sm",
                isDone && "font-medium text-emerald",
                isCurrent && "font-semibold text-purple",
                !isDone && !isCurrent && "text-slate-400",
              )}
            >
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
