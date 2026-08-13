import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type CardTone = "blue" | "green" | "purple" | "amber" | "neutral";

const toneClass: Record<CardTone, string> = {
  blue: "card-tone-blue",
  green: "card-tone-green",
  purple: "card-tone-purple",
  amber: "card-tone-amber",
  neutral: "card-tone-neutral",
};

export function SectionCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`section-card ${className}`}>{children}</section>;
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
    <div className="section-header">
      <span className={`section-icon ${toneClass[tone]}`} aria-hidden="true">
        <Icon size={16} strokeWidth={2.2} />
      </span>
      <h2 className="section-title">{title}</h2>
      {action ? <div className="section-header-action">{action}</div> : null}
    </div>
  );
}

export function LocalDevelopmentBadge() {
  return (
    <span className="local-badge" title="Chỉ dùng để kiểm tra local">
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
  const className = `status-pill status-${status.toLowerCase().replaceAll("_", "-")}`;
  return <span className={className}>{label ?? status}</span>;
}
