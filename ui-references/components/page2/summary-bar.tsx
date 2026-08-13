import { FileText, Star } from "lucide-react"
import { SectionCard } from "@/components/section-card"
import { StepBreadcrumb } from "@/components/step-breadcrumb"

const STEPS = [
  { label: "Nhập ý tưởng" },
  { label: "Nghiên cứu liên quan & tìm Research Gap" },
  { label: "Xác nhận" },
  { label: "Sang bước tiếp theo" },
]

export function SummaryBar() {
  return (
    <SectionCard className="mt-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        {/* Label */}
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <FileText className="size-5" />
          </span>
          <span className="whitespace-nowrap text-lg font-bold text-ink">Tóm tắt sau vòng 2</span>
        </div>

        {/* Breadcrumb */}
        <div className="flex-1 lg:px-6">
          <StepBreadcrumb currentStep={3} totalSteps={4} steps={STEPS} />
        </div>

        {/* Tip callout */}
        <div className="flex items-start gap-3 rounded-xl border border-brand-muted bg-brand-soft p-4 lg:max-w-sm">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
            <Star className="size-4" />
          </span>
          <p className="text-sm leading-relaxed text-brand-strong">
            <span className="font-semibold">Gợi ý:</span> Một research gap tốt phải chỉ ra nghiên cứu
            trước đã làm được gì, còn thiếu gì và vì sao phần thiếu đó quan trọng.
          </p>
        </div>
      </div>
    </SectionCard>
  )
}
