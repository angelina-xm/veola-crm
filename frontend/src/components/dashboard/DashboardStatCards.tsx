"use client";

import { cn } from "@/src/lib/cn";
import { formatMoney } from "@/src/lib/formatRelative";

type StatCard = {
  key: string;
  label: string;
  value: string;
  hint?: string;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  primary?: boolean;
  icon: React.ReactNode;
};

function DeltaPill({
  delta,
  tone,
  inverted,
}: {
  delta: string;
  tone: "up" | "down" | "neutral";
  inverted?: boolean;
}) {
  const tones = {
    up: inverted
      ? "bg-white/20 text-white"
      : "bg-emerald-50 text-emerald-700",
    down: inverted ? "bg-white/20 text-white" : "bg-rose-50 text-rose-700",
    neutral: inverted
      ? "bg-white/15 text-white/90"
      : "bg-zinc-100 text-zinc-600",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide",
        tones[tone]
      )}
    >
      {delta}
    </span>
  );
}

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
      delta: "this month",
      deltaTone: "neutral",
      primary: true,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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
      deltaTone: needsAttention > 0 ? "down" : "up",
      delta: needsAttention > 0 ? "follow up" : "healthy",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M8 4h8l1 14H7L8 4zM10 9h4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      key: "tasks",
      label: "Tasks today",
      value: loading ? "—" : String(tasksToday),
      hint: tasksCompletedToday > 0 ? `${tasksCompletedToday} completed` : undefined,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className={cn(
            "relative overflow-hidden rounded-2xl p-5 transition-shadow",
            card.primary
              ? "bg-[var(--vx-accent)] text-white shadow-[var(--vx-shadow-accent)]"
              : "border border-zinc-200/80 bg-white shadow-[var(--vx-shadow-card)]"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl",
                card.primary
                  ? "bg-white/15 text-white"
                  : "bg-blue-50 text-[var(--vx-accent)]"
              )}
            >
              {card.icon}
            </span>
            {card.delta ? (
              <DeltaPill
                delta={card.delta}
                tone={card.deltaTone ?? "neutral"}
                inverted={card.primary}
              />
            ) : null}
          </div>
          <p
            className={cn(
              "mt-4 text-xs font-medium",
              card.primary ? "text-white/80" : "text-zinc-500"
            )}
          >
            {card.label}
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-semibold tracking-tight vx-tabular",
              card.primary ? "text-white" : "text-zinc-900"
            )}
          >
            {loading && !card.primary ? "…" : card.value}
          </p>
          {card.hint ? (
            <p
              className={cn(
                "mt-1 text-xs",
                card.primary ? "text-white/70" : "text-zinc-500"
              )}
            >
              {card.hint}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
