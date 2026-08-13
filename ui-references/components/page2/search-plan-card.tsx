"use client"

import { useState } from "react"
import { Search, X } from "lucide-react"
import { SectionCard, SectionHeader } from "@/components/section-card"

const DEFAULT_KEYWORDS = ["prompt optimization", "hallucination", "claim evidence", "paper extraction"]

export function SearchPlanCard() {
  const [query, setQuery] = useState("")
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS)

  const addKeyword = (value: string) => {
    const next = value.trim()
    if (!next || keywords.includes(next)) return
    // TODO: wire to real API
    setKeywords((prev) => [...prev, next])
    setQuery("")
  }

  const removeKeyword = (keyword: string) => {
    // TODO: wire to real API
    setKeywords((prev) => prev.filter((k) => k !== keyword))
  }

  return (
    <SectionCard>
      <SectionHeader
        icon={<Search className="size-4" />}
        title="Từ khóa & kế hoạch tìm kiếm"
        iconClassName="bg-brand-soft text-brand"
        titleClassName="text-ink"
      />

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return
            if (e.key === "Enter") {
              e.preventDefault()
              addKeyword(query)
            }
          }}
          placeholder="Nhập từ khóa hoặc truy vấn tìm kiếm..."
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-colors focus:border-brand"
        />
        <button
          type="button"
          aria-label="Tìm kiếm"
          onClick={() => addKeyword(query)}
          className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-brand-soft hover:text-brand"
        >
          <Search className="size-4" />
        </button>
      </div>

      {/* Keyword chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {keywords.map((keyword) => (
          <span
            key={keyword}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-muted bg-brand-soft/60 px-2.5 py-1.5 text-sm font-medium text-brand-strong"
          >
            {keyword}
            <button
              type="button"
              aria-label={`Xóa từ khóa ${keyword}`}
              onClick={() => removeKeyword(keyword)}
              className="ml-0.5 rounded-full p-0.5 text-brand/50 transition-colors hover:bg-white hover:text-brand"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
    </SectionCard>
  )
}
