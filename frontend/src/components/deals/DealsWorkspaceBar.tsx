"use client";

import Link from "next/link";
import { cn } from "@/src/lib/cn";
import { ROUTES } from "@/src/lib/product";
import { useTranslation } from "@/src/context/LocaleContext";
import { formatPipelineMetric } from "./DealsWorkspaceBar.utils";

export type DealsBoardView = "all" | "attention" | "closing" | "high_value";
export type DealsTimeframe = "quarter" | "month" | "all";

export { formatPipelineMetric };

export default function DealsWorkspaceBar({
  pipelineName,
  pipelineValue,
  pipelineValueRaw: _pipelineValueRaw,
  activeCount,
  stageCount,
  attentionCount,
  atRiskCount,
  closingCount,
  inProgressValue,
  view,
  onViewChange,
  timeframe,
  onTimeframeChange,
  search,
  onSearchChange,
  sortByPriority,
  onSortToggle,
  onCreateDeal,
  createDisabled,
  onMenuToggle,
}: {
  pipelineName: string;
  pipelineValue: string;
  pipelineValueRaw: number;
  activeCount: number;
  stageCount: number;
  attentionCount: number;
  atRiskCount: number;
  closingCount: number;
  inProgressValue: number;
  view: DealsBoardView;
  onViewChange: (v: DealsBoardView) => void;
  timeframe: DealsTimeframe;
  onTimeframeChange: (t: DealsTimeframe) => void;
  search: string;
  onSearchChange: (q: string) => void;
  sortByPriority: boolean;
  onSortToggle: () => void;
  onCreateDeal: () => void;
  createDisabled?: boolean;
  onMenuToggle?: () => void;
}) {
  const { t } = useTranslation();

  const VIEWS: { id: DealsBoardView; label: string }[] = [
    { id: "all", label: t("deals.viewAll") },
    { id: "attention", label: t("deals.viewAttention") },
    { id: "closing", label: t("deals.viewClosing") },
    { id: "high_value", label: t("deals.viewHighValue") },
  ];

  const TIMEFRAMES: { id: DealsTimeframe; label: string }[] = [
    { id: "quarter", label: t("deals.timeframeQuarter") },
    { id: "month", label: t("deals.timeframeMonth") },
    { id: "all", label: t("deals.timeframeAll") },
  ];

  const inProgressLabel = t("deals.statusInProgress");

  const statusRows = [
    {
      label: inProgressLabel,
      value: inProgressValue,
      count: activeCount,
      dot: "bg-sky-400/80",
      isInProgress: true,
    },
    {
      label: t("deals.statusAtRisk"),
      value: 0,
      count: atRiskCount,
      dot: "bg-rose-400/80",
      hide: atRiskCount === 0,
    },
    {
      label: t("deals.statusNeedAttention"),
      value: 0,
      count: attentionCount,
      dot: "bg-amber-400/80",
      hide: attentionCount === 0,
    },
    {
      label: t("deals.statusClosingSoon"),
      value: 0,
      count: closingCount,
      dot: "bg-violet-400/80",
      hide: closingCount === 0,
    },
  ].filter((r) => !r.hide);

  return (
    <header className="vx-deals-command-bar">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {onMenuToggle ? (
              <button
                type="button"
                className="vx-deals-icon-btn lg:hidden"
                onClick={onMenuToggle}
                aria-label={t("deals.openMenu")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            ) : null}
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-[var(--vx-text)]">
                {t("deals.title")}
              </h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[var(--vx-text-muted)]">
                <span className="inline-block h-1 w-1 rounded-full bg-[var(--vx-accent)]" />
                {pipelineName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[11rem] flex-1 sm:min-w-[14rem] sm:max-w-md">
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
                placeholder={t("deals.searchPlaceholder")}
                className="vx-deals-search vx-input w-full pr-14"
              />
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-[var(--vx-border-subtle)] bg-[var(--vx-bg-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--vx-text-muted)] sm:inline">
                ⌘K
              </kbd>
            </div>

            <div
              className="vx-deals-filter-tabs hidden sm:inline-flex"
              role="tablist"
              aria-label={t("deals.filters")}
            >
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={view === v.id}
                  onClick={() => onViewChange(v.id)}
                  className={cn(view === v.id && "is-active")}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onSortToggle}
              className={cn("vx-deals-icon-btn", sortByPriority && "is-active")}
              title={t("deals.sortByPriority")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M4 6h16M7 12h10M10 18h4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <Link
              href={ROUTES.dealsClosed}
              className="vx-deals-icon-btn"
              title={t("deals.closedDealsTitle")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </Link>

            <button
              type="button"
              onClick={onCreateDeal}
              disabled={createDisabled}
              className="vx-deals-cta disabled:opacity-50"
            >
              <span aria-hidden>+</span>
              {t("deals.newDeal")}
            </button>
          </div>
        </div>

        <div className="vx-deals-metrics-panel">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-8">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--vx-text-muted)]">
                  {t("deals.pipelineValue")}
                </p>
                <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-[var(--vx-text)] vx-tabular">
                  {pipelineValue}
                  <span className="text-[var(--vx-accent)] opacity-80" aria-hidden>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M4 19V5M10 19V9M16 19v-6M22 19H2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--vx-text-muted)]">
                  {t("deals.activeDeals")}
                </p>
                <p className="mt-1 text-lg font-semibold text-[var(--vx-text)] vx-tabular">
                  {activeCount}
                  <span className="ml-1.5 text-[13px] font-normal text-[var(--vx-text-muted)]">
                    {t("deals.acrossStages", { count: stageCount })}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={timeframe}
                onChange={(e) => onTimeframeChange(e.target.value as DealsTimeframe)}
                className="vx-deals-timeframe"
                aria-label={t("deals.timeframe")}
              >
                {TIMEFRAMES.map((tf) => (
                  <option key={tf.id} value={tf.id}>
                    {tf.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {statusRows.length > 0 ? (
            <div className="mt-4 grid gap-2 border-t border-[var(--vx-border-subtle)]/60 pt-4 sm:grid-cols-2 lg:grid-cols-4">
              {statusRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-2 text-[12px]"
                >
                  <span className="flex min-w-0 items-center gap-2 text-[var(--vx-text-secondary)]">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", row.dot)} />
                    <span className="truncate">{row.label}</span>
                  </span>
                  <span className="shrink-0 text-[var(--vx-text-muted)] vx-tabular">
                    {"isInProgress" in row && row.isInProgress
                      ? formatPipelineMetric(row.value)
                      : `${row.count}`}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div
          className="vx-deals-filter-tabs inline-flex sm:hidden"
          role="tablist"
          aria-label={t("deals.filters")}
        >
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              onClick={() => onViewChange(v.id)}
              className={cn(view === v.id && "is-active")}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
