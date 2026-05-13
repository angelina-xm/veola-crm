"use client";

import { useMemo } from "react";
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
        <p className="text-sm font-medium text-zinc-600">Loading analytics…</p>
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
            Workspace
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Analytics
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
            Revenue, funnel, and team performance for deals you can access. Same data as the
            pipeline snapshot — with room to go deeper.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-zinc-200/90 bg-zinc-50/90 p-0.5"
            role="tablist"
            aria-label="Trend period"
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
                {g === "week" ? "Weekly" : "Monthly"}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled
            title="Coming in Pro"
            className="rounded-lg border border-dashed border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-400"
          >
            Export
          </button>
        </div>
      </header>

      {/* KPIs */}
      <section aria-labelledby="ws-kpis">
        <h2 id="ws-kpis" className="sr-only">
          Key metrics
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            label="Pipeline value"
            hint="Sum of open pipeline"
            value={formatUsd(kpis.pipeline_value)}
          />
          <KpiCard label="Active deals" value={String(kpis.active_deals)} />
          <KpiCard
            label="Conversion"
            hint="Won ÷ visible"
            value={formatPct(kpis.conversion_rate_pct)}
          />
          <KpiCard
            label="Stale health"
            hint="Ok · Risk · Stale"
            value={`${kpis.stale_health.healthy} · ${kpis.stale_health.at_risk} · ${kpis.stale_health.stale}`}
          />
          <KpiCard
            label="Won this month"
            hint={formatUsd(kpis.won_this_month_revenue)}
            value={kpis.won_this_month === 1 ? "1 deal" : `${kpis.won_this_month} deals`}
            accent
          />
          <KpiCard label="Avg deal size" value={formatUsd(kpis.average_deal_size)} />
        </div>
      </section>

      {/* Main insight row */}
      <section
        className="grid gap-6 lg:grid-cols-12 lg:gap-8"
        aria-labelledby="ws-insights"
      >
        <h2 id="ws-insights" className="sr-only">
          Revenue and funnel
        </h2>
        <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm lg:col-span-7 lg:p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Revenue trend
          </h3>
          <p className="mt-1 text-xs text-zinc-400">
            {data.meta.revenue_trend_basis?.replace(/_/g, " ") ?? "Won revenue by period"}
          </p>
          <div className="mt-6 min-h-[160px]">
            <RevenueTrendChart points={revenue_trend} chartHeightPx={112} />
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm lg:col-span-5 lg:p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Pipeline funnel
          </h3>
          <p className="mt-1 text-xs text-zinc-400">Deal count per stage · drop from prior</p>
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
              Team performance
            </h3>
            <p className="text-xs text-zinc-400">Assignee, else creator</p>
          </div>
        </div>
        {team_performance.length === 0 ? (
          <EmptyBlock
            className="mt-5"
            title="No team rollup yet"
            body="When visible deals have owners, leaderboard metrics appear here."
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
          Activity insights
        </h3>
        <p className="mt-1 text-xs text-zinc-400">
          Pulled from the same activity stream — grouped for scanning.
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
          <InsightColumn title="Recent" items={recentSlice} empty="No activity in this window." />
          <InsightColumn
            title="Stage changes"
            items={stageMoves.slice(0, MINI)}
            empty="No stage moves logged yet."
          />
          <InsightColumn
            title="Won deals"
            items={wonFeed.slice(0, MINI)}
            empty="No won events in the feed yet."
          />
          <InsightColumn
            title="Tasks completed"
            items={tasksDone.slice(0, MINI)}
            empty="No completed tasks in the feed yet."
          />
        </div>
      </section>

      {loading && data ? (
        <p className="text-center text-xs font-medium text-zinc-400">Refreshing data…</p>
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
