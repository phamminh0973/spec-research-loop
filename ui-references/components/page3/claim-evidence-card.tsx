"use client"

import { FileText } from "lucide-react"
import { SectionCard } from "@/components/section-card"

// TODO: replace with claim–evidence data loaded from backend
const ROWS: { label: string; value: string }[] = [
  { label: "Claim", value: "Giảm tỉ lệ claim không có bằng chứng so với baseline." },
  { label: "Baseline", value: "Zero-shot CoT (GPT-4o)" },
  { label: "Metric", value: "Tỉ lệ unsupported claims (%)" },
  {
    label: "Evidence",
    value: "Tỉ lệ unsupported giảm ≥ 20% trên val set (300 mẫu) với p < 0.05.",
  },
  {
    label: "Điều kiện bác bỏ",
    value: "Không đạt cải thiện ≥ 10% hoặc không có ý nghĩa thống kê.",
  },
]

export function ClaimEvidenceCard() {
  return (
    <SectionCard>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <FileText className="size-5" />
        </span>
        <h2 className="text-lg font-bold text-ink">Claim – Evidence Card</h2>
      </div>

      <dl className="overflow-hidden rounded-xl border border-slate-200">
        {ROWS.map((row, i) => (
          <div
            key={row.label}
            className={`grid grid-cols-[7.5rem_1fr] gap-3 px-4 py-3 ${
              i % 2 === 0 ? "bg-white" : "bg-slate-50/60"
            }`}
          >
            <dt className="text-sm font-semibold text-brand">{row.label}</dt>
            <dd className="text-sm leading-relaxed text-slate-700">{row.value}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  )
}
