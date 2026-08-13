import { Lightbulb } from "lucide-react"
import { SectionCard, SectionHeader } from "@/components/section-card"

const GAP_TEXT =
  "Các phương pháp hiện tại chủ yếu tối ưu bằng điểm tổng hoặc textual feedback. Chưa rõ việc tách output thành từng claim, kiểm tra evidence độc lập và dùng lỗi claim-level làm feedback có giúp giảm unsupported claims trong cùng ngân sách inference hay không."

export function ResearchGapCard() {
  return (
    <SectionCard>
      <SectionHeader
        icon={<Lightbulb className="size-4" />}
        title="Research gap đề xuất"
        iconClassName="bg-purple-soft text-purple"
        titleClassName="text-ink"
      />

      <div className="rounded-xl border border-purple-muted bg-purple-soft/50 p-4">
        <p className="text-sm leading-relaxed text-slate-700">{GAP_TEXT}</p>
      </div>
    </SectionCard>
  )
}
