"use client"

import { useState } from "react"
import { CircleHelp } from "lucide-react"
import { SectionCard, SectionHeader } from "@/components/section-card"
import { ChoiceGroup, type ChoiceOption } from "@/components/choice-group"

type Question = {
  id: string
  title: string
  options: ChoiceOption[]
  hint: string
  defaultValue: string
}

const QUESTIONS: Question[] = [
  {
    id: "q1",
    title: "Tác vụ chính là gì?",
    options: [
      { label: "Trích xuất thông tin", value: "extract" },
      { label: "Trả lời câu hỏi có dẫn nguồn", value: "qa" },
      { label: "Tóm tắt tài liệu", value: "summarize" },
    ],
    hint: "lấy title, method, dataset, kết quả từ paper.",
    defaultValue: "extract",
  },
  {
    id: "q2",
    title: "Bạn muốn spec cuối dùng để làm gì?",
    options: [
      { label: "Làm prototype", value: "prototype" },
      { label: "Triển khai thật", value: "production" },
      { label: "Formal review", value: "review" },
    ],
    hint: "đủ rõ để giao cho AI hoặc nhóm dev triển khai.",
    defaultValue: "production",
  },
  {
    id: "q3",
    title: "Khi thiếu thông tin, hệ thống nên?",
    options: [
      { label: "Dừng và hỏi ngay", value: "ask" },
      { label: "Đưa ra lựa chọn để bạn chọn", value: "choices" },
      { label: "Tạo giả định tạm thời có cảnh báo", value: "assume" },
    ],
    hint: "hệ thống đề xuất 3 mức quy mô dữ liệu thay vì tự đoán.",
    defaultValue: "choices",
  },
]

export function QuestionsCard() {
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(QUESTIONS.map((q) => [q.id, q.defaultValue])),
  )

  const setAnswer = (id: string, value: string) => {
    // TODO: wire to real API
    setAnswers((prev) => ({ ...prev, [id]: value }))
  }

  return (
    <SectionCard>
      <SectionHeader
        icon={<CircleHelp className="size-4" />}
        title="Câu hỏi cần xác nhận"
        iconClassName="bg-purple-soft text-purple"
        titleClassName="text-ink"
      />

      <div className="flex flex-col gap-4">
        {QUESTIONS.map((q, index) => (
          <div key={q.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-purple-muted text-xs font-bold text-purple">
                {index + 1}
              </span>
              <h3 className="text-sm font-semibold text-ink">{q.title}</h3>
            </div>
            <ChoiceGroup
              options={q.options}
              allowOther
              selected={answers[q.id]}
              onChange={(value) => setAnswer(q.id, value)}
              hint={q.hint}
            />
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
