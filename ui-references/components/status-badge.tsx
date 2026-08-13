import { cn } from "@/lib/utils"

export type StatusType =
  | "confirmed"
  | "proposed"
  | "missing"
  | "ambiguous"
  | "unsupported"
  | "conflict"
  | "critical"
  | "major"
  | "minor"
  | "ok"

/**
 * Colors reference the central theme tokens defined in globals.css
 * (the `pill-*` palette), never hardcoded hex values per usage.
 */
const STATUS_STYLES: Record<StatusType, string> = {
  confirmed: "bg-pill-green text-pill-green-fg",
  ok: "bg-pill-green text-pill-green-fg",
  proposed: "bg-pill-blue text-pill-blue-fg",
  missing: "bg-pill-slate text-pill-slate-fg",
  ambiguous: "bg-pill-amber text-pill-amber-fg",
  minor: "bg-pill-amber text-pill-amber-fg",
  unsupported: "bg-pill-orange text-pill-orange-fg",
  major: "bg-pill-orange text-pill-orange-fg",
  conflict: "bg-pill-red text-pill-red-fg",
  critical: "bg-pill-red text-pill-red-fg",
}

const STATUS_LABELS: Record<StatusType, string> = {
  confirmed: "Đã xác nhận",
  proposed: "Đề xuất",
  missing: "Thiếu",
  ambiguous: "Mơ hồ",
  unsupported: "Không có bằng chứng",
  conflict: "Xung đột",
  critical: "Nghiêm trọng",
  major: "Lớn",
  minor: "Nhỏ",
  ok: "Ổn",
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: StatusType
  label?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {label ?? STATUS_LABELS[status]}
    </span>
  )
}
