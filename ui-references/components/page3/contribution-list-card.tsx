"use client"

import { Target } from "lucide-react"
import { SectionCard } from "@/components/section-card"

// TODO: replace with contribution items loaded from backend
const CONTRIBUTIONS = [
  "Framework tối ưu prompt nhiều vòng",
  "Verifier claim–evidence",
  "So sánh scalar vs textual vs claim-level feedback",
  "Cấu hình khả thi với ngân sách giới hạn",
]

export function ContributionListCard() {
  return (
    <SectionCard>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Target className="size-5" />
        </span>
        <h2 className="text-lg font-bold text-ink">Contribution đề xuất</h2>
      </div>

      <ol className="flex flex-col">
        {CONTRIBUTIONS.map((item, i) => (
          <li
            key={item}
            className="flex items-center gap-3 border-b border-dashed border-slate-200 py-3 last:border-0"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
              {i + 1}
            </span>
            <span className="text-sm text-slate-700">{item}</span>
          </li>
        ))}
      </ol>
    </SectionCard>
  )
}
