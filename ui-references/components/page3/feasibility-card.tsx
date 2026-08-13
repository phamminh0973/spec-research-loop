"use client"

import { Cpu, Monitor, Clock, FileText, Cloud, TriangleAlert } from "lucide-react"
import { SectionCard } from "@/components/section-card"

// TODO: replace with feasibility estimates loaded from backend
const STATS: { label: string; value: string }[] = [
  { label: "Model", value: "7B–8B, 4-bit" },
  { label: "Seed prompts", value: "5" },
  { label: "Candidates mỗi vòng", value: "10" },
  { label: "Số vòng", value: "10" },
  { label: "Dev set", value: "50 mẫu" },
  { label: "Val set", value: "300 mẫu" },
  { label: "Top-k đầy đủ", value: "5" },
]

const RESOURCES: { icon: typeof Monitor; label: string; value: string }[] = [
  { icon: Monitor, label: "VRAM", value: "~ 20 GB" },
  { icon: Clock, label: "Thời gian", value: "~ 12–18 giờ" },
  { icon: FileText, label: "Token", value: "~ 3–6 triệu" },
  { icon: Cloud, label: "Chi phí API", value: "tùy chọn" },
]

export function FeasibilityCard() {
  return (
    <SectionCard>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-purple-soft text-purple">
          <Cpu className="size-5" />
        </span>
        <h2 className="text-lg font-bold text-purple">Kiểm tra tính khả thi (RTX 3090)</h2>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-purple-muted bg-purple-soft/60 px-2 py-3 text-center"
          >
            <span className="text-xs font-medium text-purple">{s.label}</span>
            <span className="text-sm font-bold text-ink">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Resource rows */}
      <div className="mt-5 flex flex-col gap-1 border-t border-dashed border-slate-200 pt-4">
        {RESOURCES.map((r) => {
          const Icon = r.icon
          return (
            <div key={r.label} className="flex items-center justify-between py-2">
              <span className="flex items-center gap-3">
                <Icon className="size-5 text-brand" />
                <span className="text-sm font-semibold text-ink">{r.label}</span>
              </span>
              <span className="text-sm font-semibold text-slate-600">{r.value}</span>
            </div>
          )
        })}
      </div>

      {/* Warning callout */}
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-soft p-4">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-accent" />
        <p className="text-sm leading-relaxed text-amber-accent">
          Nếu vượt tài nguyên, hệ thống gợi ý giảm số candidate hoặc số vòng.
        </p>
      </div>
    </SectionCard>
  )
}
