"use client"

import { Check, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"

export type ChoiceOption = {
  label: string
  value: string
}

export const OTHER_VALUE = "__other__"

export function ChoiceGroup({
  options,
  allowOther = false,
  otherLabel = "Other",
  selected,
  onChange,
  hint,
  variant = "buttons",
  className,
}: {
  options: ChoiceOption[]
  allowOther?: boolean
  otherLabel?: string
  selected: string | null
  onChange: (value: string) => void
  hint?: string
  /**
   * "buttons" — horizontal wrapped pills (default, used on steps 1-2)
   * "radio"   — vertical single-select rows with a checkmark on the selected one (step 4)
   */
  variant?: "buttons" | "radio"
  className?: string
}) {
  const items: (ChoiceOption & { letter: string })[] = options.map((opt, i) => ({
    ...opt,
    letter: String.fromCharCode(65 + i),
  }))

  if (allowOther) {
    items.push({
      label: otherLabel,
      value: OTHER_VALUE,
      letter: String.fromCharCode(65 + options.length),
    })
  }

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {variant === "radio" ? (
        <div className="flex flex-col gap-2.5" role="radiogroup">
          {items.map((item) => {
            const isSelected = selected === item.value
            return (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                // TODO: wire to real API when a choice is committed
                onClick={() => onChange(item.value)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all",
                  isSelected
                    ? "border-brand bg-brand-soft text-brand shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                <span>
                  <span className="font-semibold">{item.letter}.</span> {item.label}
                </span>
                {isSelected && (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
                    <Check className="size-3.5" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const isSelected = selected === item.value
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={isSelected}
                // TODO: wire to real API when a choice is committed
                onClick={() => onChange(item.value)}
                className={cn(
                  "min-w-[92px] rounded-xl border px-3 py-2 text-center text-sm font-medium leading-snug transition-all",
                  isSelected
                    ? "border-purple bg-purple-muted text-purple shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                {item.letter}. {item.label}
              </button>
            )
          })}
        </div>
      )}

      {hint && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Lightbulb className="size-3.5 text-amber-accent" />
          <span>
            <span className="text-slate-400">Ví dụ:</span> {hint}
          </span>
        </p>
      )}
    </div>
  )
}
