import { Lightbulb } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { IdeaCard } from "@/components/page1/idea-card"
import { InterpretationCard } from "@/components/page1/interpretation-card"
import { QuestionsCard } from "@/components/page1/questions-card"
import { SummaryBar } from "@/components/page1/summary-bar"

export default function Page() {
  return (
    <AppShell>
      {/* Page heading */}
      <div className="mb-6 flex items-start gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Lightbulb className="size-7" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink text-balance md:text-3xl">
            1. Nhập ý tưởng &amp; Làm rõ ban đầu
          </h1>
          <p className="mt-1 text-sm text-slate-500 text-pretty md:text-base">
            Biến ý tưởng nghiên cứu mơ hồ thành mô tả rõ ràng hơn bằng câu hỏi có giải thích và ví dụ.
          </p>
        </div>
      </div>

      {/* Three-column grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <IdeaCard />
        <InterpretationCard />
        <QuestionsCard />
      </div>

      {/* Summary + tip */}
      <SummaryBar />
    </AppShell>
  )
}
