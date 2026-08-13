"use client"

import { useState } from "react"
import { CircleHelp } from "lucide-react"
import { SectionCard, SectionHeader } from "@/components/section-card"
import { ChoiceGroup, type ChoiceOption } from "@/components/choice-group"

const OPTIONS: ChoiceOption[] = [
  { label: "Thuật toán tối ưu prompt", value: "prompt-algo" },
  { label: "Claim–evidence verifier", value: "verifier" },
  { label: "Human-in-the-loop", value: "human" },
  { label: "Kết hợp", value: "combine" },
]

export function FocusChoiceCard() {
  const [selected, setSelected] = useState<string>("combine")

  return (
    <SectionCard>
      <SectionHeader
        icon={<CircleHelp className="size-4" />}
        title="Bạn muốn tập trung vào hướng nào?"
        iconClassName="bg-purple-soft text-purple"
        titleClassName="text-ink"
      />

      <ChoiceGroup
        options={OPTIONS}
        allowOther
        selected={selected}
        // TODO: wire to real API
        onChange={setSelected}
        hint="vừa cải tiến prompt, vừa thêm verifier và bước xác nhận người dùng."
      />
    </SectionCard>
  )
}
