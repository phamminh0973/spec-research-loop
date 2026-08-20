import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { PersistedNodeStatus } from "@specloop/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type CardTone = "blue" | "green" | "purple" | "amber" | "neutral";

const toneClass: Record<CardTone, string> = {
  blue: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
  green:
    "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
  purple:
    "bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400",
  amber:
    "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
  neutral: "bg-muted text-muted-foreground",
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
    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold tracking-wider text-amber-700 uppercase dark:text-amber-300">
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
  const variantMap = {
    PROPOSED: "secondary",
    AVAILABLE: "default",
    USER_CONFIRMED: "default",
    SYSTEM_VERIFIED: "default",
    NEEDS_REVIEW: "outline",
    AMBIGUOUS: "secondary",
    MISSING: "outline",
    UNSUPPORTED: "destructive",
    CONFLICT: "destructive",
    USER_REJECTED: "destructive",
    SUPERSEDED: "outline",
  } satisfies Record<
    PersistedNodeStatus | "AVAILABLE",
    "default" | "secondary" | "destructive" | "outline"
  >;
  const variant =
    (
      variantMap as Record<
        string,
        "default" | "secondary" | "destructive" | "outline"
      >
    )[status] ?? "secondary";
  const display = label ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        variant === "default" &&
          "bg-primary/10 text-primary dark:bg-primary/20",
        variant === "secondary" && "bg-secondary text-secondary-foreground",
        variant === "outline" &&
          "border-border bg-background text-foreground border",
        variant === "destructive" && "bg-destructive/10 text-destructive"
      )}
    >
      {display}
    </span>
  );
}
