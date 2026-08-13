import { Eye, FlaskConical, Grid2x2, Lightbulb, Search, Star, Cpu, FileText } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { SectionCard } from "@/components/section-card"

type SpecItem = {
  icon: LucideIcon
  title: string
  desc: string
}

// TODO: replace with the temporary spec fetched from the backend
const SPEC_ITEMS: SpecItem[] = [
  { icon: Lightbulb, title: "Problem Statement", desc: "Mô tả vấn đề và bối cảnh nghiên cứu." },
  { icon: Search, title: "Research Gap", desc: "Khoảng trống nghiên cứu cần giải quyết." },
  { icon: Star, title: "Contributions", desc: "Những đóng góp chính của paper." },
  { icon: Grid2x2, title: "Claim–Evidence Matrix", desc: "Bảng ánh xạ claim và bằng chứng." },
  { icon: FlaskConical, title: "Experimental Protocol", desc: "Thiết kế thí nghiệm & chi tiết thực thi." },
  { icon: Cpu, title: "Compute Budget", desc: "Ngân sách compute & tài nguyên." },
]

export function TempSpecCard() {
  return (
    <SectionCard>
      <div className="mb-4 flex items-center gap-2.5">
        <FileText className="size-5 text-brand" />
        <h2 className="text-lg font-bold text-ink">Spec tạm thời</h2>
      </div>

      <ol className="flex flex-col">
        {SPEC_ITEMS.map((item, i) => {
          const Icon = item.icon
          const isLast = i === SPEC_ITEMS.length - 1
          return (
            <li
              key={item.title}
              className={`flex items-start gap-3 py-3 ${isLast ? "" : "border-b border-slate-100"}`}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold text-ink">{item.title}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.desc}</p>
              </div>
            </li>
          )
        })}
      </ol>

      <button
        type="button"
        // TODO: open the full temporary spec detail view
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-muted bg-white px-4 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft"
      >
        <Eye className="size-4" />
        Xem chi tiết Spec tạm thời
      </button>
    </SectionCard>
  )
}
