import { FlaskConical, ScanSearch, ShieldCheck, Star, Target, Trophy, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { SectionCard } from "@/components/section-card"
import { StatusBadge, type StatusType } from "@/components/status-badge"

type Judge = {
  name: string
  role: string
  icon: LucideIcon
  desc: string
}

// TODO: replace with judge panel data from the backend
const JUDGES: Judge[] = [
  { name: "Judge 1", role: "Gap Judge", icon: Target, desc: "Đánh giá khoảng trống & tính cần thiết của nghiên cứu." },
  { name: "Judge 2", role: "Contribution Judge", icon: Star, desc: "Đánh giá đóng góp mới & mức độ khác biệt của paper." },
  { name: "Judge 3", role: "Experiment Judge", icon: FlaskConical, desc: "Đánh giá thiết kế thí nghiệm & độ đáng tin cậy." },
  { name: "Judge 4", role: "Evidence Judge", icon: ScanSearch, desc: "Đánh giá bằng chứng, phân tích & kết quả hỗ trợ claim." },
  { name: "Judge 5", role: "Conference Readiness", icon: Trophy, desc: "Đánh giá tính phù hợp & khả năng chấp nhận của conference." },
]

type Issue = {
  severity: StatusType
  severityLabel: string
  title: string
  desc: string
  judges: string
}

// TODO: replace with aggregated issues from the judge panel
const ISSUES: Issue[] = [
  { severity: "critical", severityLabel: "CRITICAL", title: "Thiếu hidden test", desc: "Thiếu đánh giá tổng quát trên dữ liệu unseen.", judges: "J1, J3, J4" },
  { severity: "major", severityLabel: "MAJOR", title: "Claim tổng quát quá rộng", desc: "Claim hiện tại bao phủ quá nhiều khía cạnh.", judges: "J1, J2, J5" },
  { severity: "major", severityLabel: "MAJOR", title: "Thiếu baseline TextGrad", desc: "Cần bổ sung baseline TextGrad để so sánh.", judges: "J3, J4" },
  { severity: "minor", severityLabel: "MINOR", title: "Chưa ghi rõ token budget", desc: "Chưa nêu rõ giới hạn token cho từng mô hình.", judges: "J3, J5" },
]

export function JudgePanelCard() {
  return (
    <SectionCard>
      <div className="mb-4 flex items-center gap-2.5">
        <Users className="size-5 text-brand" />
        <h2 className="text-lg font-bold text-ink">Panel Judge độc lập</h2>
      </div>

      {/* 5 judge cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {JUDGES.map((judge) => {
          const Icon = judge.icon
          return (
            <div
              key={judge.name}
              className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-3 text-center"
            >
              <p className="text-xs font-semibold text-ink">{judge.name}:</p>
              <p className="mb-2 text-xs font-semibold text-ink">{judge.role}</p>
              <span className="mb-2 flex size-11 items-center justify-center rounded-full bg-purple-soft text-purple">
                <Icon className="size-5" />
              </span>
              <div className="mb-2 flex gap-1" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="size-1 rounded-full bg-purple/40" />
                ))}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">{judge.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Info banner */}
      <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        <ShieldCheck className="size-4 text-purple" />
        Các Judge đánh giá độc lập, không xem nhận xét của nhau.
      </div>

      {/* Issue summary */}
      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-orange-accent" />
            <h3 className="text-base font-bold text-ink">Tổng hợp issue</h3>
          </div>
          <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand">
            {ISSUES.length} issue
          </span>
        </div>

        <ul className="flex flex-col gap-2">
          {ISSUES.map((issue) => (
            <li
              key={issue.title}
              className="grid grid-cols-[80px_1fr_auto] items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5"
            >
              <StatusBadge status={issue.severity} label={issue.severityLabel} className="justify-center" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{issue.title}</p>
                <p className="truncate text-xs text-slate-500">{issue.desc}</p>
              </div>
              <span className="rounded-lg bg-purple-soft px-2 py-1 text-xs font-medium text-purple">
                {issue.judges}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  )
}
