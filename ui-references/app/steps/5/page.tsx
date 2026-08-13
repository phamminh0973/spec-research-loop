"use client"

import { useState } from "react"
import {
  BookOpen,
  Check,
  CheckCircle2,
  Code2,
  FileDown,
  FileText,
  Pencil,
  Sparkles,
  Target,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { SectionCard } from "@/components/section-card"
import { StepBreadcrumb } from "@/components/step-breadcrumb"
import { Button } from "@/components/ui/button"

const STEPS = [
  { label: "Nhập ý tưởng" },
  { label: "Làm rõ" },
  { label: "Nghiên cứu" },
  { label: "Judge" },
  { label: "Spec cuối" },
]

const CHECKLIST = [
  "Problem statement",
  "Research question",
  "Related-work matrix",
  "Research gap",
  "Contributions",
  "Claim–evidence matrix",
  "Experimental protocol",
  "Compute budget",
  "Risks & limitations",
  "Decision log",
]

export default function Step5Page() {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <AppShell>
      <div className="mb-6 rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <StepBreadcrumb currentStep={5} totalSteps={5} steps={STEPS} variant="overview" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <SectionCard className="lg:col-span-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl border border-brand-muted bg-brand-soft text-brand">
              <FileText className="size-6" />
            </span>
            <h1 className="text-xl font-extrabold tracking-tight text-ink">Bản đặc tả nghiên cứu cuối</h1>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {CHECKLIST.map((item, index) => (
              <div key={item} className="flex items-center gap-4 border-b border-slate-200 px-4 py-3 last:border-b-0">
                <CheckCircle2 className="size-6 shrink-0 fill-emerald text-white" aria-hidden="true" />
                <span className="w-5 text-sm text-ink">{index + 1}.</span>
                <span className="text-base text-ink">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 rounded-xl border border-emerald/25 bg-emerald-soft p-4">
            <Target className="size-11 shrink-0 text-emerald" />
            <p className="text-base font-medium leading-6 text-ink">Đề tài tập trung vào tối ưu prompt bằng feedback claim-level để giảm unsupported claim khi trích xuất thông tin từ paper khoa học.</p>
          </div>
        </SectionCard>

        <div className="flex flex-col gap-5 lg:col-span-6">
          <SectionCard>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-soft text-emerald"><Sparkles className="size-6" /></span>
              <h2 className="text-xl font-extrabold text-emerald">LLM tóm tắt cách làm</h2>
            </div>
            <ol className="flex flex-col gap-3">
              {["Chọn contribution chính.", "Đối sánh với prior work để tìm khoảng trống nghiên cứu.", "Thiết kế thí nghiệm và chọn baseline phù hợp.", "Xác nhận với Judge và người dùng trước khi chốt spec."].map((item, index) => (
                <li key={item} className="flex items-center gap-4 text-base text-ink">
                  <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-emerald/20 bg-emerald-soft font-semibold text-emerald">{index + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </SectionCard>

          <SectionCard>
            <div className="mb-3 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl border border-brand-muted bg-brand-soft text-brand"><BookOpen className="size-6" /></span>
              <h2 className="text-xl font-extrabold text-brand">Ví dụ dễ hiểu</h2>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-[104px_36px_1fr] items-center border-b border-slate-200 text-base text-ink">
                <span className="m-1 rounded-lg bg-brand-soft px-4 py-4 font-semibold text-ink">Trước</span><span className="text-center">:</span><span className="px-3">“Tối ưu prompt tốt hơn.”</span>
              </div>
              <div className="grid grid-cols-[104px_36px_1fr] items-center text-base text-ink">
                <span className="m-1 rounded-lg bg-emerald-soft px-4 py-4 font-semibold text-emerald">Sau</span><span className="text-center">:</span><span className="px-3 py-3 leading-6">“Giảm unsupported claim bằng feedback claim-level, so sánh với OPRO và self-refine dưới cùng ngân sách inference.”</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="mb-3 flex items-center gap-3"><CheckCircle2 className="size-7 text-emerald" /><h2 className="text-xl font-extrabold text-emerald">Xác nhận cuối cùng</h2></div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => setConfirmed(true)} className="h-12 bg-brand px-4 text-white hover:bg-brand-strong"><Check className="size-4" />Xác nhận spec</Button>
              <Button type="button" variant="outline" className="h-12 border-brand text-brand"><Pencil className="size-4" />Chỉnh sửa thêm</Button>
              <Button type="button" variant="outline" className="h-12 border-slate-300 bg-white text-ink hover:bg-slate-50"><FileDown className="size-4" />Xuất PDF</Button>
              <Button type="button" variant="outline" className="h-12 border-slate-300 bg-white text-ink hover:bg-slate-50"><Code2 className="size-4" />Xuất Markdown</Button>
            </div>
            {confirmed && <p className="mt-3 text-sm font-medium text-emerald" role="status">Spec đã được xác nhận.</p>}
            {/* TODO: wire confirmation and export actions to backend APIs. */}
          </SectionCard>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-3 rounded-xl border border-emerald/30 bg-emerald-soft px-6 py-4 text-center text-lg font-bold text-emerald">
        <CheckCircle2 className="size-8 shrink-0 fill-emerald text-white" />
        <span>Spec đã sẵn sàng cho bước triển khai hoặc viết proposal.</span>
      </div>
    </AppShell>
  )
}
