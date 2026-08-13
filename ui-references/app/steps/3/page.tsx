import { Lightbulb } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { ContributionListCard } from "@/components/page3/contribution-list-card"
import { ClaimEvidenceCard } from "@/components/page3/claim-evidence-card"
import { ExperimentPlanCard } from "@/components/page3/experiment-plan-card"
import { FeasibilityCard } from "@/components/page3/feasibility-card"
import { SummaryBar } from "@/components/page3/summary-bar"

export default function Step3Page() {
  return (
    <AppShell>
      {/* Page heading */}
      <div className="mb-6 flex items-start gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Lightbulb className="size-7" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-balance md:text-3xl">
            <span className="text-brand">3.</span>{" "}
            <span className="text-ink">Xây dựng Contribution &amp; Kế hoạch thí nghiệm</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 text-pretty md:text-base">
            Biến research gap thành contribution, claim rõ ràng và kế hoạch kiểm chứng từng bước.
          </p>
        </div>
      </div>

      {/* Main grid: left contribution+claim · middle experiments · right feasibility */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-4">
          <ContributionListCard />
          <ClaimEvidenceCard />
        </div>

        <div className="lg:col-span-4">
          <ExperimentPlanCard />
        </div>

        <div className="lg:col-span-4">
          <FeasibilityCard />
        </div>
      </div>

      {/* Summary + tip */}
      <SummaryBar />
    </AppShell>
  )
}
