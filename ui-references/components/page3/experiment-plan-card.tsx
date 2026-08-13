"use client"

import { FlaskConical } from "lucide-react"
import { SectionCard } from "@/components/section-card"

type Experiment = {
  code: string
  title: string
  bullets: string[]
}

// TODO: replace with experiment plan loaded from backend
const EXPERIMENTS: Experiment[] = [
  {
    code: "TN1",
    title: "So sánh baseline",
    bullets: [
      "So sánh hệ thống đề xuất với 3 baseline.",
      "Đo tỉ lệ unsupported claims và factual accuracy.",
      "Kiểm định ý nghĩa thống kê.",
    ],
  },
  {
    code: "TN2",
    title: "Đánh giá chất lượng",
    bullets: [
      "Đánh giá trên dev và val set.",
      "Tính đủ 2 metric: unsupported claims & factual accuracy.",
      "Phân tích theo từng chủ đề/dataset.",
    ],
  },
  {
    code: "TN3",
    title: "Ablation study",
    bullets: [
      "Loại bỏ verifier (–V) để đo tác động.",
      "So sánh scalar vs textual vs claim-level feedback.",
      "Đo hiệu quả theo số vòng (3, 5, 10, 15).",
    ],
  },
  {
    code: "TN4",
    title: "Generalization",
    bullets: [
      "Thử trên 2–3 domain/dataset ngoài benchmark.",
      "Kiểm tra zero-shot và few-shot.",
      "Đánh giá khả năng chuyển miền.",
    ],
  },
  {
    code: "TN5",
    title: "Efficiency study",
    bullets: [
      "Đo thời gian, token và VRAM theo số vòng & candidate.",
      "So sánh cấu hình 4-bit vs 8-bit.",
      "Tối ưu cấu hình cho ngân sách giới hạn.",
    ],
  },
]

export function ExperimentPlanCard() {
  return (
    <SectionCard>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-soft text-emerald">
          <FlaskConical className="size-5" />
        </span>
        <h2 className="text-lg font-bold text-ink">Kế hoạch thí nghiệm</h2>
      </div>

      <ul className="flex flex-col gap-3">
        {EXPERIMENTS.map((exp) => (
          <li
            key={exp.code}
            className="flex gap-4 rounded-xl border border-emerald-100 bg-emerald-soft/40 p-4"
          >
            <div className="flex w-20 shrink-0 flex-col items-center gap-1 text-center">
              <span className="rounded-md bg-emerald-soft px-2 py-1 font-mono text-sm font-bold text-emerald">
                {exp.code}
              </span>
              <span className="text-sm font-semibold leading-tight text-ink text-balance">
                {exp.title}
              </span>
            </div>
            <ul className="flex flex-1 flex-col gap-1.5 border-l border-emerald-100 pl-4">
              {exp.bullets.map((b) => (
                <li key={b} className="flex gap-2 text-sm text-slate-700">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald" aria-hidden />
                  <span className="leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
