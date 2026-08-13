import { Brain, Target, ShieldCheck } from "lucide-react"
import { SectionCard, SectionHeader } from "@/components/section-card"

const PROBLEMS = [
  "Prompt thủ công có thể không ổn định",
  "LLM dễ tạo unsupported claims",
  "Cần cách kiểm tra claim–evidence rõ ràng",
]

export function InterpretationCard() {
  return (
    <div className="flex flex-col gap-5">
      <SectionCard>
        <SectionHeader
          icon={<Brain className="size-4" />}
          title="Cách hệ thống đang hiểu ý tưởng"
          iconClassName="bg-emerald-soft text-emerald"
          titleClassName="text-emerald"
        />
        <div className="rounded-xl border border-emerald/20 bg-emerald-soft/60 p-4">
          <p className="text-[15px] leading-relaxed text-slate-700">
            Hệ thống hiểu rằng bạn muốn tạo một vòng lặp tối ưu prompt: sinh nhiều prompt, chạy thử
            trên cùng tập paper, phát hiện lỗi và tiếp tục cải tiến để giảm thông tin không có bằng
            chứng trong tài liệu nguồn.
          </p>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={<Target className="size-4" />}
          title="Vấn đề chính"
          iconClassName="bg-orange-soft text-orange-accent"
          titleClassName="text-orange-accent"
        />
        <ul className="flex flex-col gap-2.5">
          {PROBLEMS.map((problem) => (
            <li key={problem} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-slate-700">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-orange-accent" aria-hidden />
              {problem}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-accent/20 bg-amber-soft px-4 py-3">
          <ShieldCheck className="size-4 text-amber-accent" />
          <span className="text-sm text-slate-600">
            Mức chắc chấn: <span className="font-semibold text-amber-accent">Trung bình</span>
          </span>
        </div>
      </SectionCard>
    </div>
  )
}
