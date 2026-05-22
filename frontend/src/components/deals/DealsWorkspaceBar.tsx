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
    <div className="sticky top-[var(--vx-topbar-height)] z-20 -mx-[var(--vx-container-pad,0)] border-b border-[var(--vx-border)] bg-[var(--vx-surface)]/92 px-0 py-3 backdrop-blur-md">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-[var(--vx-text)]">
              {NAV_LABELS.deals}
            </h1>
            <p className="mt-0.5 text-xs text-[var(--vx-text-muted)]">
              {COPY.dealsBoardHint}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative hidden sm:block">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--vx-text-muted)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search deals…"
                className="vx-input h-8 w-44 pl-8 text-xs lg:w-52"
              />
            </div>
            <button
              type="button"
              onClick={onSortToggle}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                sortByPriority
                  ? "border-[var(--vx-accent)]/40 bg-[var(--vx-accent-soft)] text-[var(--vx-accent)]"
                  : "border-[var(--vx-border)] text-[var(--vx-text-secondary)] hover:bg-[var(--vx-bg-subtle)]"
              )}
            >
              Priority sort
            </button>
            <Link
              href={ROUTES.dealsClosed}
              className="rounded-lg border border-[var(--vx-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--vx-text-secondary)] hover:bg-[var(--vx-bg-subtle)]"
            >
              Closed
            </Link>
            <button
              type="button"
              onClick={onCreateDeal}
              disabled={createDisabled}
              className="rounded-lg bg-[var(--vx-accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--vx-shadow-accent)] hover:bg-[var(--vx-accent-hover)] disabled:opacity-50"
            >
              New deal
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {metrics.map((m) => (
            <div
              key={m.label}
              className={cn(
                "rounded-lg border px-3 py-1.5",
                m.tone === "accent" && "border-[var(--vx-accent)]/25 bg-[var(--vx-accent-soft)]",
                m.tone === "warn" && "border-amber-500/20 bg-amber-500/5",
                m.tone === "success" && "border-emerald-500/20 bg-emerald-500/5",
                (!m.tone || m.tone === "default") &&
                  "border-[var(--vx-border-subtle)] bg-[var(--vx-bg-subtle)]"
              )}
            >
              <span className="text-sm font-semibold tracking-tight text-[var(--vx-text)] vx-tabular">
                {m.value}
              </span>
              <span className="ml-2 text-[11px] text-[var(--vx-text-muted)]">{m.label}</span>
            </div>
          ))}
        </div>

        <div
          className="flex flex-wrap gap-1 rounded-lg border border-[var(--vx-border-subtle)] bg-[var(--vx-bg-subtle)] p-0.5"
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
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                view === v.id
                  ? "bg-[var(--vx-surface)] text-[var(--vx-text)] shadow-sm"
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

/** Format pipeline total for metric chip */
export function formatPipelineMetric(total: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    notation: total >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 0,
  }).format(total);
}
