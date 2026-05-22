"use client";

import Link from "next/link";
import { cn } from "@/src/lib/cn";
import { COPY, NAV_LABELS, ROUTES } from "@/src/lib/product";

export type DealsBoardView = "all" | "attention" | "closing" | "high_value";

const VIEWS: { id: DealsBoardView; label: string }[] = [
  { id: "all", label: "All deals" },
  { id: "attention", label: "Attention" },
  { id: "closing", label: "Closing soon" },
  { id: "high_value", label: "High value" },
];

type Metric = {
  label: string;
  value: string;
  tone?: "default" | "accent" | "warn" | "success";
};

export default function DealsWorkspaceBar({
  metrics,
  view,
  onViewChange,
  search,
  onSearchChange,
  sortByPriority,
  onSortToggle,
  onCreateDeal,
  createDisabled,
}: {
  metrics: Metric[];
  view: DealsBoardView;
  onViewChange: (v: DealsBoardView) => void;
  search: string;
  onSearchChange: (q: string) => void;
  sortByPriority: boolean;
  onSortToggle: () => void;
  onCreateDeal: () => void;
  createDisabled?: boolean;
}) {
  return (
    <div className="vx-deals-workspace-bar sticky top-[var(--vx-topbar-height)] z-20 -mx-1 border-b border-[var(--vx-border-subtle)] bg-[var(--vx-surface)]/88 px-1 pb-5 pt-2 backdrop-blur-xl">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 shrink-0">
            <h1 className="text-xl font-semibold tracking-tight text-[var(--vx-text)]">
              {NAV_LABELS.deals}
            </h1>
            <p className="mt-1 max-w-md text-[13px] leading-relaxed text-[var(--vx-text-muted)]">
              {COPY.dealsBoardHint}
            </p>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:max-w-2xl">
            <div className="relative w-full sm:max-w-xs lg:max-w-sm">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--vx-text-muted)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M16 16l4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search deals, clients…"
                className="vx-deals-search vx-input w-full"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onSortToggle}
                className={cn(
                  "vx-btn-secondary",
                  sortByPriority &&
                    "border-[var(--vx-accent)]/30 bg-[var(--vx-accent-soft)] text-[var(--vx-accent)]"
                )}
              >
                Priority
              </button>
              <Link href={ROUTES.dealsClosed} className="vx-btn-secondary">
                Closed
              </Link>
              <button
                type="button"
                onClick={onCreateDeal}
                disabled={createDisabled}
                className="vx-btn-primary disabled:opacity-50"
              >
                New deal
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {metrics.map((m) => (
            <div
              key={m.label}
              className={cn(
                "vx-deals-metric",
                m.tone === "warn" && "border-amber-500/15",
                m.tone === "accent" && "border-[var(--vx-accent)]/15"
              )}
            >
              <span className="text-[15px] font-semibold tracking-tight text-[var(--vx-text)] vx-tabular">
                {m.value}
              </span>
              <span className="text-[12px] text-[var(--vx-text-muted)]">{m.label}</span>
            </div>
          ))}
        </div>

        <div
          className="inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-[var(--vx-border-subtle)] bg-[var(--vx-board-bg)] p-1"
          role="tablist"
          aria-label="Deal views"
        >
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              onClick={() => onViewChange(v.id)}
              className={cn(
                "rounded-lg px-4 py-2 text-[12px] font-medium transition-all duration-200",
                view === v.id
                  ? "bg-[var(--vx-card-bg)] text-[var(--vx-text)] shadow-sm"
                  : "text-[var(--vx-text-muted)] hover:text-[var(--vx-text-secondary)]"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function formatPipelineMetric(total: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    notation: total >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 0,
  }).format(total);
}
