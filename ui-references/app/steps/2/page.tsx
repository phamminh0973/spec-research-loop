import { Search } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { SearchPlanCard } from "@/components/page2/search-plan-card"
import { PrioritySourcesCard } from "@/components/page2/priority-sources-card"
import { RelatedWorkTable } from "@/components/page2/related-work-table"
import { ResearchGapCard } from "@/components/page2/research-gap-card"
import { FocusChoiceCard } from "@/components/page2/focus-choice-card"
import { SummaryBar } from "@/components/page2/summary-bar"

export default function Step2Page() {
  return (
    <AppShell>
      {/* Page heading */}
      <div className="mb-6 flex items-start gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Search className="size-7" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink text-balance md:text-3xl">
            2. Nghiên cứu liên quan &amp; tìm Research Gap
          </h1>
          <p className="mt-1 text-sm text-slate-500 text-pretty md:text-base">
            Đối sánh các công trình liên quan, rút ra khoảng trống nghiên cứu và các hướng khả thi.
          </p>
        </div>
      </div>

      {/* Main grid: left plan · wide table · right insights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-3">
          <SearchPlanCard />
          <PrioritySourcesCard />
        </div>

        <div className="lg:col-span-5">
          <RelatedWorkTable />
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <ResearchGapCard />
          <FocusChoiceCard />
        </div>
      </div>

      {/* Summary + tip */}
      <SummaryBar />
    </AppShell>
  )
}
