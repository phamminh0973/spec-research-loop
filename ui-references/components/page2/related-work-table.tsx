import { Table2, FileText } from "lucide-react"
import { SectionCard, SectionHeader } from "@/components/section-card"

type RelatedWork = {
  name: string
  year: string
  did: string
  feedback: string
  missing: string
}

const ROWS: RelatedWork[] = [
  {
    name: "OPRO",
    year: "2023",
    did: "Tối ưu prompt bằng search + score tự động để tăng chất lượng trả lời.",
    feedback: "Score tổng tự động",
    missing:
      "Không tách claim; không kiểm tra evidence độc lập; chưa đánh giá unsupported claims.",
  },
  {
    name: "PromptBreeder",
    year: "2023",
    did: "Tiến hóa prompt với LLM để tìm prompt tốt hơn.",
    feedback: "Score tổng tự động",
    missing: "Vẫn dựa trên điểm tổng; chưa dùng tín hiệu ở mức claim.",
  },
  {
    name: "TextGrad",
    year: "2024",
    did: "Tối ưu prompt bằng gradient (textual) từ LLM.",
    feedback: "Textual feedback",
    missing: "Textual feedback khó đo lường chính xác; chưa đánh giá ở mức claim.",
  },
  {
    name: "DSPy",
    year: "2024",
    did: "Framework tối ưu & biên dịch prompt cho các tác vụ.",
    feedback: "Score/metric tự động",
    missing: "Chưa có bước xác minh evidence; chưa thử kết hợp verifier & human-in-the-loop.",
  },
]

export function RelatedWorkTable() {
  return (
    <SectionCard className="h-full">
      <SectionHeader
        icon={<Table2 className="size-4" />}
        title="Bảng đối sánh related work"
        iconClassName="bg-emerald-soft text-emerald"
        titleClassName="text-ink"
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="whitespace-nowrap py-3 pr-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                Nghiên cứu
              </th>
              <th className="py-3 pr-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                Đã làm gì?
              </th>
              <th className="py-3 pr-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                Loại feedback
              </th>
              <th className="py-3 pr-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                Điểm còn thiếu
              </th>
              <th className="whitespace-nowrap py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                Nguồn
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.name} className="border-b border-slate-100 align-top last:border-0">
                <td className="py-4 pr-4">
                  <button
                    type="button"
                    // TODO: wire to real API / open source paper
                    className="text-left text-sm font-semibold text-brand hover:underline"
                  >
                    {row.name}
                  </button>
                  <div className="mt-0.5 text-xs text-slate-400">({row.year})</div>
                </td>
                <td className="py-4 pr-4 text-sm leading-relaxed text-slate-600">{row.did}</td>
                <td className="py-4 pr-4 text-sm leading-relaxed text-slate-600">{row.feedback}</td>
                <td className="py-4 pr-4 text-sm leading-relaxed text-slate-600">{row.missing}</td>
                <td className="py-4">
                  <button
                    type="button"
                    aria-label={`Mở nguồn ${row.name}`}
                    // TODO: wire to real API / open source document
                    className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-purple transition-colors hover:bg-purple-soft"
                  >
                    <FileText className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}
