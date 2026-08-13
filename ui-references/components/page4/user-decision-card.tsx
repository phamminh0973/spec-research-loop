"use client"

import { useState } from "react"
import { Brain, CircleCheckBig, User } from "lucide-react"
import { ChoiceGroup, OTHER_VALUE, type ChoiceOption } from "@/components/choice-group"
import { SectionCard } from "@/components/section-card"

const CHOICES: ChoiceOption[] = [
  { label: "Thu hẹp claim", value: "narrow" },
  { label: "Mở rộng thí nghiệm", value: "expand" },
  { label: "Chuyển thành research question", value: "question" },
]

// TODO: replace with backend-provided final-spec checklist
const FINAL_CHECKS = ["Claim rõ hơn", "Thí nghiệm đầy đủ hơn", "Judge issue đã xử lý"]

export function UserDecisionCard() {
  const [choice, setChoice] = useState<string | null>("narrow")

  return (
    <div className="flex flex-col gap-6">
      {/* User choice */}
      <SectionCard>
        <div className="mb-4 flex items-center gap-2.5">
          <User className="size-5 text-brand" />
          <h2 className="text-lg font-bold text-ink">Lựa chọn của người dùng</h2>
        </div>

        <ChoiceGroup
          variant="radio"
          options={CHOICES}
          allowOther
          selected={choice}
          // TODO: wire to real API when the user commits a decision
          onChange={setChoice}
        />

        {/* System understanding */}
        <div className="mt-4 rounded-xl border border-brand-muted bg-brand-soft p-4">
          <div className="mb-1.5 flex items-center gap-2">
            <Brain className="size-4 text-brand" />
            <h3 className="text-sm font-bold text-brand-strong">Cách hệ thống đang hiểu lựa chọn</h3>
          </div>
          <p className="text-sm leading-relaxed text-slate-600">
            {choice === OTHER_VALUE
              ? "Bạn đã chọn một hướng khác. Hãy mô tả rõ hơn để hệ thống điều chỉnh spec cuối."
              : "Hệ thống hiểu rằng bạn muốn thu hẹp claim để tập trung vào phạm vi hẹp hơn trong domain paper-science, loại bỏ các khía cạnh ngoài phạm vi."}
          </p>
        </div>
      </SectionCard>

      {/* Final spec */}
      <div className="rounded-2xl border border-emerald/30 bg-emerald-soft p-5">
        <div className="mb-3 flex items-center gap-2">
          <CircleCheckBig className="size-5 text-emerald" />
          <h2 className="text-lg font-bold text-emerald">Spec cuối cùng</h2>
        </div>

        <ul className="mb-4 flex flex-col gap-2">
          {FINAL_CHECKS.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
              <CircleCheckBig className="size-4 shrink-0 text-emerald" />
              {item}
            </li>
          ))}
        </ul>

        <button
          type="button"
          // TODO: confirm and export the final spec via the backend
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald px-4 py-3 text-sm font-semibold text-white transition-colors hover:brightness-95"
        >
          <CircleCheckBig className="size-4" />
          Xác nhận &amp; xuất Spec cuối
        </button>
      </div>
    </div>
  )
}
