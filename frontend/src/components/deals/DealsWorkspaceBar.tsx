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

export default function DealsWorkspaceBar({
  pipelineValue,
  activeCount,
  attentionCount,
  atRiskCount,
  closingCount,
  view,
  onViewChange,
  search,
  onSearchChange,
  sortByPriority,
  onSortToggle,
  onCreateDeal,
  createDisabled,
}: {
  pipelineValue: string;
  activeCount: number;
  attentionCount: number;
  atRiskCount: number;
  closingCount: number;
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
    <div className="vx-deals-workspace-bar sticky top-[var(--vx-topbar-height)] z-20 -mx-1 border-b border-[var(--vx-border-subtle)] bg-[var(--vx-surface)]/90 px-1 pb-4 pt-2 backdrop-blur-xl">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-[var(--vx-text)]">
              {NAV_LABELS.deals}
            </h1>
            <p className="mt-0.5 text-[12px] text-[var(--vx-text-muted)]">
              {COPY.dealsBoardHint}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vx-text-muted)]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
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

        <div className="vx-deals-pipeline-summary flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
          <span className="font-semibold text-[var(--vx-text)] vx-tabular">
            {pipelineValue}
            <span className="ml-1.5 font-normal text-[var(--vx-text-muted)]">
              pipeline
            </span>
          </span>
          <span className="h-3 w-px bg-[var(--vx-border-subtle)]" aria-hidden />
          <span className="text-[var(--vx-text-secondary)] vx-tabular">
            <span className="font-medium text-[var(--vx-text)]">{activeCount}</span>{" "}
            active
          </span>
          {closingCount > 0 ? (
            <>
              <span className="h-3 w-px bg-[var(--vx-border-subtle)]" aria-hidden />
              <span className="inline-flex items-center gap-1.5 text-violet-300/90">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400/80" />
                {closingCount} closing soon
              </span>
            </>
          ) : null}
          {atRiskCount > 0 ? (
            <>
              <span className="h-3 w-px bg-[var(--vx-border-subtle)]" aria-hidden />
              <span className="inline-flex items-center gap-1.5 text-rose-300/90">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400/80" />
                {atRiskCount} at risk
              </span>
            </>
          ) : null}
          {attentionCount > 0 ? (
            <>
              <span className="h-3 w-px bg-[var(--vx-border-subtle)]" aria-hidden />
              <span className="inline-flex items-center gap-1.5 text-amber-200/90">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
                {attentionCount} need attention
              </span>
            </>
          ) : null}
        </div>

        <div
          className="inline-flex max-w-full flex-wrap gap-0.5 rounded-xl border border-[var(--vx-border-subtle)] bg-[var(--vx-board-bg)] p-0.5"
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
                "rounded-lg px-3.5 py-1.5 text-[11px] font-medium transition-all duration-200",
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
