import { Scale } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { TempSpecCard } from "@/components/page4/temp-spec-card"
import { JudgePanelCard } from "@/components/page4/judge-panel-card"
import { UserDecisionCard } from "@/components/page4/user-decision-card"
import { SummaryBar } from "@/components/page4/summary-bar"

export default function Step4Page() {
  return (
    <AppShell>
      {/* Page heading */}
      <div className="mb-6 flex items-start gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-purple-soft text-purple">
          <Scale className="size-7" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-balance md:text-3xl">
            <span className="text-brand">4.</span>{" "}
            <span className="text-ink">Judge độc lập &amp; Xác nhận bản cuối</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 text-pretty md:text-base">
            Spec tạm thời được phản biện bởi nhiều judge độc lập trước khi người dùng quyết định sửa
            hay chốt bản cuối.
          </p>
        </div>
      </div>

      {/* Main grid: left temp spec · middle judge panel · right user decision */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <TempSpecCard />
        </div>

        <div className="lg:col-span-6">
          <JudgePanelCard />
        </div>

        <div className="lg:col-span-3">
          <UserDecisionCard />
        </div>
      </div>

      {/* Summary + tip */}
      <SummaryBar />
    </AppShell>
  )
}
