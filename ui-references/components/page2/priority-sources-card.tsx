"use client"

import { useState } from "react"
import { Layers, Info, Check } from "lucide-react"
import { SectionCard } from "@/components/section-card"
import { cn } from "@/lib/utils"

type Source = {
  id: string
  label: string
  checked: boolean
}

const DEFAULT_SOURCES: Source[] = [
  { id: "peer", label: "Paper peer-reviewed", checked: true },
  { id: "proceedings", label: "Proceedings chính thức", checked: true },
  { id: "author", label: "Tài liệu tác giả", checked: true },
  { id: "survey", label: "Survey có nguồn rõ ràng", checked: true },
]

export function PrioritySourcesCard() {
  const [sources, setSources] = useState<Source[]>(DEFAULT_SOURCES)

  const toggle = (id: string) => {
    // TODO: wire to real API
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, checked: !s.checked } : s)))
  }

  return (
    <SectionCard>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Layers className="size-4" />
        </span>
        <h2 className="text-base font-bold text-ink">Nguồn ưu tiên</h2>
        <button
          type="button"
          aria-label="Thông tin về nguồn ưu tiên"
          className="ml-auto text-slate-300 transition-colors hover:text-slate-500"
        >
          <Info className="size-4" />
        </button>
      </div>

      <ul className="flex flex-col gap-3">
        {sources.map((source) => (
          <li key={source.id}>
            <button
              type="button"
              aria-pressed={source.checked}
              onClick={() => toggle(source.id)}
              className="flex w-full items-center gap-3 text-left"
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                  source.checked
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-slate-300 bg-white text-transparent",
                )}
              >
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              <span className="text-sm font-medium text-slate-700">{source.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
