"use client";

import { cn } from "@/src/lib/cn";
import { formatMoney } from "@/src/lib/formatRelative";

type StatCard = {
  key: string;
  label: string;
  value: string;
  sub?: string;
  tag?: string;
  tagTone?: "neutral" | "success" | "warning" | "danger";
  primary?: boolean;
  iconTone?: "purple" | "teal" | "amber" | "green";
  icon: React.ReactNode;
};

const ICON_TONES: Record<string, string> = {
  purple: "bg-[var(--vx-accent-muted)] text-[var(--vx-accent)]",
  teal: "vx-badge-success",
  amber: "vx-badge-warning",
  green: "vx-badge-success",
};

const TAG_TONES: Record<string, string> = {
  neutral: "vx-badge-neutral",
  success: "vx-badge-success",
  warning: "vx-badge-warning",
  danger: "vx-badge-danger",
};

export default function DashboardStatCards({
  revenue,
  activeDeals,
  tasksToday,
  tasksCompletedToday,
  needsAttention,
  loading,
}: {
  revenue: string;
  activeDeals: number;
  tasksToday: number;
  tasksCompletedToday: number;
  needsAttention: number;
  loading?: boolean;
}) {
  const cards: StatCard[] = [
    {
      key: "revenue",
      label: "Revenue",
      value: formatMoney(revenue),
      sub: "Won this month",
      tag: "Primary",
      tagTone: "neutral",
      primary: true,
      iconTone: "purple",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      key: "deals",
      label: "Active deals",
      value: loading ? "—" : String(activeDeals),
      sub: "On your board",
      tagTone: "success",
      tag: "Open",
      iconTone: "teal",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 7h6M14 7h6M4 12h4M10 12h10M4 17h8M14 17h6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      key: "attention",
      label: "Needs attention",
      value: loading ? "—" : String(needsAttention),
      sub: needsAttention > 0 ? "Review follow-ups" : "Pipeline healthy",
      tag: needsAttention > 0 ? "Action" : "Clear",
      tagTone: needsAttention > 0 ? "danger" : "success",
      iconTone: "amber",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 9v4M12 17h.01M10.3 4.7l-7.5 13A2 2 0 004.5 21h15a2 2 0 001.7-3.3l-7.5-13a2 2 0 00-3.4 0z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      key: "tasks",
      label: "Tasks today",
      value: loading ? "—" : String(tasksToday),
      sub:
        tasksCompletedToday > 0
          ? `${tasksCompletedToday} completed today`
          : "Overdue + due today",
      tag: tasksToday > 0 ? `${tasksToday} open` : "Clear",
      tagTone: tasksToday > 0 ? "warning" : "success",
      iconTone: "green",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M9 11l2 2 4-4M7 4h10a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className={cn(
            "relative overflow-hidden rounded-[14px] p-[18px]",
            card.primary ? "vx-kpi-primary" : "vx-kpi-secondary"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <span
              className={cn(
                "flex h-[34px] w-[34px] items-center justify-center rounded-[9px]",
                card.primary
                  ? "bg-white/15 text-white"
                  : ICON_TONES[card.iconTone ?? "purple"]
              )}
            >
              {card.icon}
            </span>
            {card.tag ? (
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide",
                  card.primary
                    ? "bg-white/20 text-white"
                    : TAG_TONES[card.tagTone ?? "neutral"]
                )}
              >
                {card.tag}
              </span>
            ) : null}
          </div>
          <p
            className={cn(
              "mt-3.5 text-[11px] font-medium tracking-wide",
              card.primary ? "text-white/75" : "text-[var(--vx-text-muted)]"
            )}
          >
            {card.label}
          </p>
          <p
            className={cn(
              "mt-0.5 text-[28px] font-bold leading-none tracking-tight vx-tabular",
              card.primary ? "text-white" : "text-[var(--vx-text)]"
            )}
          >
            {card.value}
          </p>
          {card.sub ? (
            <p
              className={cn(
                "mt-1 text-[11px]",
                card.primary ? "text-white/65" : "text-[var(--vx-text-muted)]"
              )}
            >
              {card.sub}
            </p>
          ) : null}
          {card.primary ? (
            <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-white/20">
              <div className="h-full w-2/3 rounded-full bg-white/90" />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
