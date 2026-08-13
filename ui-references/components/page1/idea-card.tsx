"use client"

import { useState } from "react"
import { Lightbulb, Pencil, Tag, Search, X } from "lucide-react"
import { SectionCard, SectionHeader } from "@/components/section-card"
import { cn } from "@/lib/utils"

const DEFAULT_IDEA =
  "Tôi muốn xây dựng phương pháp tự động tối ưu prompt nhiều vòng để giảm hallucination khi LLM trích xuất thông tin từ paper."

const DEFAULT_TAGS = ["Nghiên cứu AI", "Prompt Optimization", "Hallucination", "Paper Extraction"]

export function IdeaCard() {
  const [idea, setIdea] = useState(DEFAULT_IDEA)
  const [editing, setEditing] = useState(false)
  const [tags, setTags] = useState<string[]>(DEFAULT_TAGS)

  const removeTag = (tag: string) => {
    // TODO: wire to real API
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  return (
    <SectionCard>
      <SectionHeader
        icon={<Lightbulb className="size-4" />}
        title="Ý tưởng ban đầu"
        iconClassName="bg-brand-soft text-brand"
        titleClassName="text-brand"
      />

      {/* Idea quote box */}
      <div className="relative rounded-xl border border-brand-muted bg-brand-soft/40 p-4">
        {editing ? (
          <textarea
            autoFocus
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            onBlur={() => setEditing(false)}
            rows={4}
            className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-slate-700 outline-none"
          />
        ) : (
          <blockquote className="pr-6 text-[15px] leading-relaxed text-slate-700">
            <span className="mr-1 text-brand">&ldquo;</span>
            {idea}
            <span className="ml-1 text-brand">&rdquo;</span>
          </blockquote>
        )}

        <button
          type="button"
          aria-label={editing ? "Lưu ý tưởng" : "Chỉnh sửa ý tưởng"}
          aria-pressed={editing}
          onClick={() => setEditing((v) => !v)}
          className={cn(
            "absolute bottom-3 right-3 flex size-7 items-center justify-center rounded-md transition-colors",
            editing ? "bg-brand text-brand-foreground" : "text-slate-400 hover:bg-white hover:text-brand",
          )}
        >
          <Pencil className="size-3.5" />
        </button>
      </div>

      {/* Tag chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="group inline-flex items-center gap-1.5 rounded-lg border border-brand-muted bg-white px-2.5 py-1.5 text-sm font-medium text-brand-strong"
          >
            <Tag className="size-3.5 text-brand" />
            {tag}
            <button
              type="button"
              aria-label={`Xóa nhãn ${tag}`}
              onClick={() => removeTag(tag)}
              className="ml-0.5 rounded-full p-0.5 text-brand/50 transition-colors hover:bg-brand-soft hover:text-brand"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Analyze button */}
      <button
        type="button"
        // TODO: wire to real API
        onClick={() => {}}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-semibold text-brand-foreground shadow-sm transition-colors hover:bg-brand-strong"
      >
        <Search className="size-4" />
        Phân tích ý tưởng
      </button>
    </SectionCard>
  )
}
