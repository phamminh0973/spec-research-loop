import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function SectionCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
        className,
      )}
    >
      {children}
    </section>
  )
}

export function SectionHeader({
  icon,
  title,
  iconClassName,
  titleClassName,
}: {
  icon: ReactNode
  title: string
  iconClassName?: string
  titleClassName?: string
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-lg",
          iconClassName,
        )}
      >
        {icon}
      </span>
      <h2 className={cn("text-base font-bold", titleClassName)}>{title}</h2>
    </div>
  )
}
