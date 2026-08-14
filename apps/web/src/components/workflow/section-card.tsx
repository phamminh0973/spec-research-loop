import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type CardTone = "blue" | "green" | "purple" | "amber" | "neutral";

const toneClass: Record<CardTone, string> = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600",
  amber: "bg-amber-50 text-amber-600",
  neutral: "bg-slate-100 text-slate-600",
};

export function SectionCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <Card className={cn("shadow-sm", className)}>{children}</Card>;
}

export function SectionHeader({
  icon: Icon,
  title,
  tone = "neutral",
  action,
}: {
  icon: LucideIcon;
  title: string;
  tone?: CardTone;
  action?: ReactNode;
}) {
  return (
    <CardHeader className="pb-3">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg",
            toneClass[tone]
          )}
          aria-hidden="true"
        >
          <Icon className="size-4.5" />
        </span>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {action ? <div className="ml-auto">{action}</div> : null}
      </div>
    </CardHeader>
  );
}

export function LocalDevelopmentBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800">
      LOCAL DEVELOPMENT FIXTURE
    </span>
  );
}

export function StatusPill({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    PROPOSED: "secondary",
    AVAILABLE: "default",
    USER_CONFIRMED: "default",
    SYSTEM_VERIFIED: "default",
    NEEDS_REVIEW: "outline",
    AMBIGUOUS: "secondary",
    MISSING: "outline",
    UNSUPPORTED: "destructive",
  };
  const variant = variantMap[status] ?? "secondary";
  const display = label ?? status;
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
      variant === "default" && "bg-blue-50 text-blue-700",
      variant === "secondary" && "bg-slate-100 text-slate-700",
      variant === "outline" && "border border-slate-300 bg-white text-slate-700",
      variant === "destructive" && "bg-red-50 text-red-700"
    )}>
      {display}
    </span>
  );
}
