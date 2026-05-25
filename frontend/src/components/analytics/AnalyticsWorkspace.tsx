"use client";

import { useCallback, useMemo } from "react";
import ProBadge from "@/src/components/billing/ProBadge";
import { useBilling } from "@/src/hooks/useBilling";
import type {
  AnalyticsGranularity,
  AnalyticsV1FeedItem,
  AnalyticsV1Overview,
} from "@/src/types";
import {
  ActivityRow,
  AnalyticsErrorCard,
  EmptyBlock,
  formatPct,
  formatUsd,
  FunnelStagesList,
  KpiCard,
  RevenueTrendChart,
  TeamRow,
} from "./analyticsPrimitives";
import { useTranslation } from "@/src/context/LocaleContext";

const FEED_PREVIEW = 10;
const MINI = 5;

function filterByKind(items: AnalyticsV1FeedItem[], kinds: AnalyticsV1FeedItem["kind"][]) {
  const set = new Set(kinds);
  return items.filter((i) => set.has(i.kind));
}

export default function AnalyticsWorkspace({
  data,
  loading,
  error,
  granularity,
  onGranularityChange,
  onRetry,
}: {
  data: AnalyticsV1Overview | null;
  loading: boolean;
  error: string | null;
  granularity: AnalyticsGranularity;
  onGranularityChange: (g: AnalyticsGranularity) => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const { entitlements, isLocked } = useBilling();
  const exportLocked = isLocked("exportReports");

  const handleExport = useCallback(() => {
    if (!data || exportLocked) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vexora-analytics-${granularity}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, exportLocked, granularity]);

  const feed = data?.recent_activity ?? [];
  const stageMoves = useMemo(() => filterByKind(feed, ["deal_moved"]), [feed]);
  const wonFeed = useMemo(() => filterByKind(feed, ["deal_won"]), [feed]);
  const tasksDone = useMemo(() => filterByKind(feed, ["task_completed"]), [feed]);
  const recentSlice = useMemo(() => feed.slice(0, FEED_PREVIEW), [feed]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[38vh] flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200/80 bg-white py-16 shadow-sm">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-700"
          aria-hidden
        />
        <p className="text-sm font-medium text-zinc-600">{t("analyticsWorkspace.loading")}</p>
      </div>
    );
  }

  if (error) {
    return <AnalyticsErrorCard error={error} onRetry={onRetry} />;
  }

  if (!data) {
    return null;
  }

  const { kpis, funnel, revenue_trend, team_performance } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-zinc-200/80 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            {t("nav.workspace")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            {t("analytics.pageTitle")}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
            {t("copy.analyticsHint")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-zinc-200/90 bg-zinc-50/90 p-0.5"
            role="tablist"
            aria-label={t("analyticsWorkspace.trendPeriod")}
          >
            {(["week", "month"] as const).map((g) => (
              <button
                key={g}
                type="button"
                role="tab"
                aria-selected={granularity === g}
                onClick={() => onGranularityChange(g)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  granularity === g
                    ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {g === "week" ? t("analyticsWorkspace.granularityWeek") : t("analyticsWorkspace.granularityMonth")}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={exportLocked || !data}
            title={
              exportLocked
                ? t("analyticsWorkspace.exportLocked")
                : t("analyticsWorkspace.exportJson")
            }
            onClick={handleExport}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              exportLocked
                ? "cursor-not-allowed border-dashed border-zinc-200 bg-white text-zinc-400"
                : "border-zinc-200/90 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            {t("analyticsWorkspace.exportJson")}
            <ProBadge devUnlock={entitlements.devUnlock} className="!px-1.5 !py-0 !text-[9px]" />
          </button>
        </div>
      </header>

      {/* KPIs */}
      <section aria-labelledby="ws-kpis">
        <h2 id="ws-kpis" className="sr-only">
          {t("analyticsWorkspace.keyMetricsSr")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            label={t("analyticsWorkspace.openValue")}
            hint={t("analyticsWorkspace.openValueHint")}
            value={formatUsd(kpis.pipeline_value)}
          />
          <KpiCard label={t("analyticsWorkspace.kpiActiveDeals")} value={String(kpis.active_deals)} />
          <KpiCard
            label={t("analyticsWorkspace.conversion")}
            hint={t("analyticsWorkspace.conversionHint")}
            value={formatPct(kpis.conversion_rate_pct)}
          />
          <KpiCard
            label={t("analyticsWorkspace.staleHealth")}
            hint={t("analyticsWorkspace.staleHint")}
            value={`${kpis.stale_health.healthy} · ${kpis.stale_health.at_risk} · ${kpis.stale_health.stale}`}
          />
          <KpiCard
            label={t("analyticsWorkspace.wonThisMonth")}
            hint={formatUsd(kpis.won_this_month_revenue)}
            value={
              kpis.won_this_month === 1
                ? t("analyticsWorkspace.oneDeal")
                : t("analyticsWorkspace.dealsCount", { count: kpis.won_this_month })
            }
            accent
          />
          <KpiCard label={t("analyticsWorkspace.avgDealSize")} value={formatUsd(kpis.average_deal_size)} />
        </div>
      </section>

      {/* Main insight row */}
      <section
        className="grid gap-6 lg:grid-cols-12 lg:gap-8"
        aria-labelledby="ws-insights"
      >
        <h2 id="ws-insights" className="sr-only">
          {t("analyticsWorkspace.revenueFunnelSr")}
        </h2>
        <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm lg:col-span-7 lg:p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("analyticsWorkspace.sectionRevenue")}
          </h3>
          <p className="mt-1 text-xs text-zinc-400">
            {data.meta.revenue_trend_basis?.replace(/_/g, " ") ??
              t("analyticsWorkspace.revenueChartAria")}
          </p>
          <div className="mt-6 min-h-[160px]">
            <RevenueTrendChart points={revenue_trend} chartHeightPx={112} />
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm lg:col-span-5 lg:p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("analyticsWorkspace.dealFunnel")}
          </h3>
          <p className="mt-1 text-xs text-zinc-400">{t("analyticsWorkspace.stageDropHint")}</p>
          <div className="mt-5 max-h-[min(420px,55vh)] overflow-y-auto pr-1">
            <FunnelStagesList funnel={funnel} />
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("analyticsWorkspace.sectionTeam")}
            </h3>
            <p className="text-xs text-zinc-400">{t("analyticsWorkspace.assigneeHint")}</p>
          </div>
        </div>
        {team_performance.length === 0 ? (
          <EmptyBlock
            className="mt-5"
            title={t("analyticsWorkspace.noTeamTitle")}
            body={t("analyticsWorkspace.noTeamBody")}
          />
        ) : (
          <ul className="mt-5 space-y-2">
            {team_performance.map((row) => (
              <TeamRow key={row.user_id} row={row} />
            ))}
          </ul>
        )}
      </section>

      {/* Activity insights */}
      <section className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("analyticsWorkspace.activityInsights")}
        </h3>
        <p className="mt-1 text-xs text-zinc-400">
          {t("analyticsWorkspace.activityInsightsHint")}
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
          <InsightColumn title={t("analyticsWorkspace.colRecent")} items={recentSlice} empty={t("analyticsWorkspace.emptyRecent")} />
          <InsightColumn
            title={t("analyticsWorkspace.colStageChanges")}
            items={stageMoves.slice(0, MINI)}
            empty={t("analyticsWorkspace.emptyStageMoves")}
          />
          <InsightColumn
            title={t("analyticsWorkspace.colWonDeals")}
            items={wonFeed.slice(0, MINI)}
            empty={t("analyticsWorkspace.emptyWonEvents")}
          />
          <InsightColumn
            title={t("analyticsWorkspace.colTasksCompleted")}
            items={tasksDone.slice(0, MINI)}
            empty={t("analyticsWorkspace.emptyTasksCompleted")}
          />
        </div>
      </section>

      {loading && data ? (
        <p className="text-center text-xs font-medium text-zinc-400">{t("analyticsWorkspace.refreshing")}</p>
      ) : null}
    </div>
  );
}

function InsightColumn({
  title,
  items,
  empty,
}: {
  title: string;
  items: AnalyticsV1FeedItem[];
  empty: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50/40">
      <div className="border-b border-zinc-100/80 px-3 py-2">
        <h4 className="text-[11px] font-semibold text-zinc-800">{title}</h4>
      </div>
      {items.length === 0 ? (
        <p className="px-3 py-4 text-center text-[11px] leading-relaxed text-zinc-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-zinc-100/90">
          {items.map((item) => (
            <li key={`${title}-${item.id}`}>
              <ActivityRow item={item} dense />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
