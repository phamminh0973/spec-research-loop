"use client"

import { useRef, useState } from "react"
import { ChevronDown, FileText, Loader2, Pencil, PanelRightOpen, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { StatusBadge, type StatusType } from "@/components/status-badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

export type SpecFieldKey =
  | "problemStatement"
  | "researchQuestion"
  | "relatedWorkMatrix"
  | "researchGap"
  | "contributions"
  | "claimEvidenceMatrix"
  | "experimentalProtocol"
  | "computeBudget"
  | "risksLimitations"
  | "decisionLog"

export type SpecField = {
  key: SpecFieldKey
  title: string
  status: StatusType
  preview: string
  content: string
}

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  text: string
}

// Mock data kept consistent with the spec built across steps 1-5.
// TODO: replace with the real spec fetched from the backend, scoped to the current project.
const INITIAL_SPEC_FIELDS: SpecField[] = [
  {
    key: "problemStatement",
    title: "Problem statement",
    status: "confirmed",
    preview: "Unsupported claim xuất hiện khi LLM trích xuất thông tin từ paper khoa học.",
    content:
      "Unsupported claim xuất hiện khi LLM trích xuất thông tin từ paper khoa học, làm giảm độ tin cậy của kết quả tổng hợp.",
  },
  {
    key: "researchQuestion",
    title: "Research question",
    status: "confirmed",
    preview: "Feedback claim-level có giảm tỉ lệ unsupported claim tốt hơn feedback toàn văn không?",
    content:
      "Feedback claim-level có giảm tỉ lệ unsupported claim tốt hơn feedback toàn văn khi tối ưu prompt trích xuất không?",
  },
  {
    key: "relatedWorkMatrix",
    title: "Related-work matrix",
    status: "confirmed",
    preview: "So sánh OPRO, self-refine và feedback claim-level trên 3 tiêu chí.",
    content:
      "So sánh OPRO, self-refine và feedback claim-level trên 3 tiêu chí: độ chính xác, chi phí inference và khả năng khái quát.",
  },
  {
    key: "researchGap",
    title: "Research gap",
    status: "confirmed",
    preview: "Chưa có nghiên cứu áp dụng feedback ở mức claim cho tối ưu prompt trích xuất khoa học.",
    content:
      "Chưa có nghiên cứu nào áp dụng feedback ở mức claim (thay vì toàn văn) cho tối ưu prompt trích xuất thông tin khoa học.",
  },
  {
    key: "contributions",
    title: "Contributions",
    status: "proposed",
    preview: "Pipeline feedback claim-level + benchmark trên 3 domain khoa học.",
    content:
      "Đề xuất pipeline feedback claim-level để tối ưu prompt, cùng benchmark đánh giá trên 3 domain khoa học khác nhau.",
  },
  {
    key: "claimEvidenceMatrix",
    title: "Claim–evidence matrix",
    status: "proposed",
    preview: "5 claim chính, mỗi claim gắn với evidence từ thí nghiệm A/B.",
    content:
      "5 claim chính về hiệu quả của feedback claim-level, mỗi claim gắn với evidence cụ thể từ thí nghiệm A/B tương ứng.",
  },
  {
    key: "experimentalProtocol",
    title: "Experimental protocol",
    status: "proposed",
    preview: "3 baseline, 2 dataset, 5 lần lặp, đo F1 và unsupported rate.",
    content:
      "3 baseline (prompt gốc, OPRO, self-refine), 2 dataset khoa học, 5 lần lặp mỗi cấu hình, đo F1 và tỉ lệ unsupported claim.",
  },
  {
    key: "computeBudget",
    title: "Compute budget",
    status: "ambiguous",
    preview: "Chưa chốt số GPU-hour, cần xác nhận với Judge.",
    content:
      "Chưa chốt số GPU-hour cho toàn bộ thí nghiệm, cần xác nhận thêm với Judge trước khi lên kế hoạch triển khai.",
  },
  {
    key: "risksLimitations",
    title: "Risks & limitations",
    status: "ambiguous",
    preview: "Rủi ro overfit theo domain, chưa có kế hoạch giảm thiểu rõ ràng.",
    content:
      "Rủi ro overfit theo domain khoa học cụ thể, chưa có kế hoạch giảm thiểu rõ ràng cho việc khái quát hóa sang domain khác.",
  },
  {
    key: "decisionLog",
    title: "Decision log",
    status: "missing",
    preview: "",
    content: "",
  },
]

const DOT_STYLES: Record<StatusType, string> = {
  confirmed: "bg-pill-green-fg",
  ok: "bg-pill-green-fg",
  proposed: "bg-pill-blue-fg",
  missing: "bg-pill-slate-fg",
  ambiguous: "bg-pill-amber-fg",
  minor: "bg-pill-amber-fg",
  unsupported: "bg-pill-orange-fg",
  major: "bg-pill-orange-fg",
  conflict: "bg-pill-red-fg",
  critical: "bg-pill-red-fg",
}

export function SpecPreviewPanel({ className }: { className?: string }) {
  const [fields] = useState<SpecField[]>(INITIAL_SPEC_FIELDS)
  const [expandedKeys, setExpandedKeys] = useState<Set<SpecFieldKey>>(new Set())
  const [input, setInput] = useState("")
  const [history, setHistory] = useState<ChatMessage[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function toggleField(key: SpecFieldKey) {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function handleEditField(field: SpecField) {
    setInput(`Chỉnh sửa "${field.title}": `)
    textareaRef.current?.focus()
  }

  function handleSubmit() {
    const trimmed = input.trim()
    if (!trimmed) return

    // TODO: POST edit request + current spec snapshot to backend, receive updated field(s) back
    setHistory((prev) =>
      [
        ...prev,
        { id: `u-${Date.now()}`, role: "user" as const, text: trimmed },
        { id: `a-${Date.now()}`, role: "assistant" as const, text: "Đang xử lý yêu cầu chỉnh sửa..." },
      ].slice(-5),
    )
    setInput("")
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const isComposing = event.nativeEvent.isComposing || event.keyCode === 229
    if (event.key === "Enter" && !event.shiftKey && !isComposing) {
      event.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className={cn("flex h-full flex-col bg-white", className)}>
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-3.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <FileText className="size-4" />
        </span>
        <h2 className="text-sm font-bold text-ink">Bản đặc tả hiện tại</h2>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <ul className="divide-y divide-slate-200">
          {fields.map((field) => {
            const isOpen = expandedKeys.has(field.key)
            const hasContent = field.content.trim().length > 0

            return (
              <li key={field.key}>
                <button
                  type="button"
                  onClick={() => toggleField(field.key)}
                  aria-expanded={isOpen}
                  className="flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{field.title}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={field.status} />
                      <ChevronDown
                        className={cn("size-4 shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  {!isOpen && (
                    <p className={cn("truncate text-xs", hasContent ? "text-slate-500" : "italic text-slate-400")}>
                      {hasContent ? field.preview : "Chưa có nội dung"}
                    </p>
                  )}
                </button>

                {isOpen && (
                  <div className="flex flex-col gap-2.5 px-4 pb-4">
                    <p className={cn("text-sm leading-6", hasContent ? "text-slate-600" : "italic text-slate-400")}>
                      {hasContent ? field.content : "Chưa có nội dung"}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit border-slate-300 text-ink"
                      onClick={() => handleEditField(field)}
                    >
                      <Pencil className="size-3.5" />
                      Sửa
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </ScrollArea>

      <div className="flex shrink-0 flex-col gap-2.5 border-t border-slate-200 bg-slate-50 p-3">
        {history.length > 0 && (
          <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
            {history.map((message) => (
              <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                <p
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-1.5 text-xs leading-5",
                    message.role === "user"
                      ? "bg-brand text-white"
                      : "flex items-center gap-1.5 border border-slate-200 bg-white text-slate-500",
                  )}
                >
                  {message.role === "assistant" && <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden="true" />}
                  {message.text}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập yêu cầu chỉnh sửa spec, ví dụ: 'Thu hẹp research gap chỉ tập trung vào claim-level feedback'"
            className="max-h-32 min-h-16 flex-1 resize-none bg-white text-sm"
          />
          <Button
            type="button"
            size="icon"
            disabled={!input.trim()}
            onClick={handleSubmit}
            className="shrink-0 bg-brand text-white hover:bg-brand-strong disabled:opacity-40"
            aria-label="Gửi yêu cầu chỉnh sửa"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function SpecPreviewCollapsedRail({
  onExpand,
  className,
}: {
  onExpand: () => void
  className?: string
}) {
  return (
    <div className={cn("flex h-full w-14 flex-col items-center gap-3 bg-white py-4", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onExpand}
        aria-label="Mở bảng xem trước spec"
        className="text-slate-500"
      >
        <PanelRightOpen className="size-5" />
      </Button>
      <div className="flex flex-col items-center gap-2 overflow-y-auto py-1">
        {INITIAL_SPEC_FIELDS.map((field) => (
          <span
            key={field.key}
            title={field.title}
            aria-hidden="true"
            className={cn("size-2.5 shrink-0 rounded-full", DOT_STYLES[field.status])}
          />
        ))}
      </div>
    </div>
  )
}
