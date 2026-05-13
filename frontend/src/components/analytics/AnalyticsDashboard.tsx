"use client";

import { useMemo } from "react";
import type {
  AnalyticsGranularity,
  AnalyticsV1FeedItem,
  AnalyticsV1Overview,
  AnalyticsV1TeamRow,
} from "@/src/types";

const ACTIVITY_PREVIEW = 7;

function formatUsd(amountStr: string): string {
  const n = Number.parseFloat(amountStr);
  if (!Number.isFinite(n)) return amountStr;
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatPct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function formatShortTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function feedLabel(item: AnalyticsV1FeedItem): string {
  switch (item.kind) {
    case "deal_won":
      return "Deal won";
    case "deal_moved":
      return "Deal moved";
    case "note_added":
      return "Note added";
    case "task_completed":
      return "Task completed";
    case "task_open":
      return "Task";
    default:
      return item.type
        ? item.type.charAt(0).toUpperCase() + item.type.slice(1)
        : "Activity";
  }
}

function feedTone(item: AnalyticsV1FeedItem): string {
  switch (item.kind) {
    case "deal_won":
      return "bg-emerald-500/15 text-emerald-700 ring-emerald-500/20";
    case "deal_moved":
      return "bg-violet-500/10 text-violet-700 ring-violet-500/15";
    case "task_completed":
      return "bg-sky-500/10 text-sky-800 ring-sky-500/15";
    case "note_added":
      return "bg-amber-500/10 text-amber-800 ring-amber-500/15";
    default:
      return "bg-zinc-500/10 text-zinc-600 ring-zinc-500/10";
  }
}

/** Compact bar chart: fixed column width so 1–2 points never become a “wall”. */
function RevenueTrendChart({
  points,
}: {
  points: { period_start: string; revenue: string }[];
}) {
  if (points.length === 0) {
    return (
      <div className="flex min-h-[132px] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 px-5 py-8 text-center">
        <p className="text-sm font-medium tracking-tight text-zinc-800">
          Close your first deal to unlock revenue trends
        </p>
        <p className="mt-2 max-w-[260px] text-xs leading-relaxed text-zinc-500">
          Won deal value over time will appear here once you have closed revenue in
          this window.
        </p>
      </div>
    );
  }

  const values = points.map((p) => Number.parseFloat(p.revenue));
  const numeric = values.map((v) => (Number.isFinite(v) ? v : 0));
  const max = Math.max(1e-9, ...numeric);
  const chartH = 96;

  return (
    <div className="w-full">
      <div className="mb-1 flex items-end justify-end">
        <span className="text-[10px] font-medium tabular-nums text-zinc-400">
          Max {formatUsd(String(max))}
        </span>
      </div>
      <div
        className="mx-auto flex max-w-md items-end justify-center gap-2 border-b border-zinc-200/90 pb-px sm:gap-2.5"
        style={{ minHeight: chartH + 28 }}
        role="img"
        aria-label="Won revenue by period"
      >
        {points.map((p, i) => {
          const v = numeric[i] ?? 0;
          const pxH = v <= 0 ? 0 : Math.max(3, Math.round((v / max) * chartH));
          const label = p.period_start
            ? new Date(p.period_start).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })
            : "—";
          return (
            <div
              key={`${p.period_start}-${i}`}
              className="flex h-[124px] w-9 flex-col items-stretch justify-end sm:w-10"
            >
              <div
                className="group relative w-full"
                title={`${label}: ${formatUsd(p.revenue)}`}
              >
                <div
                  className="w-full rounded-t-[4px] bg-zinc-800/90 shadow-sm ring-1 ring-zinc-950/5 transition-[height] duration-500 ease-out"
                  style={{ height: pxH }}
                />
              </div>
              <span className="mt-1.5 block text-center text-[10px] font-medium leading-none text-zinc-500">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalyticsDashboard({
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
  const activityPreview = useMemo(
    () => (data?.recent_activity ?? []).slice(0, ACTIVITY_PREVIEW),
    [data?.recent_activity]
  );

  if (loading && !data) {
    return (
      <div className="mb-6 rounded-xl border border-zinc-200/80 bg-white p-10 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col items-center justify-center gap-3 text-zinc-500">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-700"
            aria-hidden
          />
          <p className="text-sm font-medium text-zinc-600">Loading analytics…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 rounded-xl border border-red-200/90 bg-red-50/50 px-5 py-4 text-red-950">
        <p className="text-sm font-semibold tracking-tight">Analytics unavailable</p>
        <p className="mt-1.5 text-xs leading-relaxed text-red-900/85">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-md bg-red-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { kpis, funnel, revenue_trend, team_performance, recent_activity } = data;
  const maxFunnel = Math.max(1, ...funnel.map((s) => s.deal_count));
  const hasMoreActivity = recent_activity.length > ACTIVITY_PREVIEW;

  return (
    <div className="mb-8 rounded-xl border border-zinc-200/70 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* —— Header (secondary to KPIs) —— */}
      <div className="border-b border-zinc-100 px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-zinc-900">
              Sales overview
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
              Live snapshot of pipeline health — only deals you can access.
            </p>
          </div>
          <div
            className="inline-flex shrink-0 rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-0.5"
            role="tablist"
            aria-label="Revenue trend grouping"
          >
            {(["week", "month"] as const).map((g) => (
              <button
                key={g}
                type="button"
                role="tab"
                aria-selected={granularity === g}
                onClick={() => onGranularityChange(g)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                  granularity === g
                    ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {g === "week" ? "Weekly" : "Monthly"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
        {/* —— 1. Critical KPIs —— */}
        <section aria-labelledby="analytics-kpis-heading">
          <h3 id="analytics-kpis-heading" className="sr-only">
            Key metrics
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
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
              label="Health"
              hint="Ok · Risk · Stale"
              value={`${kpis.stale_health.healthy} · ${kpis.stale_health.at_risk} · ${kpis.stale_health.stale}`}
            />
            <KpiCard
              label="Won this month"
              hint={formatUsd(kpis.won_this_month_revenue)}
              value={kpis.won_this_month === 1 ? "1 deal" : `${kpis.won_this_month} deals`}
              accent
            />
            <KpiCard label="Avg deal" value={formatUsd(kpis.average_deal_size)} />
          </div>
        </section>

        {/* —— 2. Funnel + revenue —— */}
        <section
          className="mt-5 grid gap-3 lg:grid-cols-2 lg:gap-4"
          aria-labelledby="analytics-insights-heading"
        >
          <h3 id="analytics-insights-heading" className="sr-only">
            Pipeline and revenue
          </h3>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50/20 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Pipeline funnel
              </h4>
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-400">Deals per stage · drop from prior</p>
            {funnel.length === 0 ? (
              <EmptyBlock
                className="mt-4"
                title="No funnel stages"
                body="Add pipeline stages in settings so deal flow appears here."
              />
            ) : (
              <ul className="mt-4 space-y-3.5">
                {funnel.map((stage) => {
                  const pct = Math.round((stage.deal_count / maxFunnel) * 100);
                  return (
                    <li key={stage.stage_id} className="group">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <span className="truncate rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-800 ring-1 ring-zinc-200/80">
                            {stage.name}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] font-medium tabular-nums text-zinc-600">
                          {stage.deal_count}
                          {stage.dropoff_from_previous_pct != null ? (
                            <span className="ml-1.5 font-normal text-amber-700/90">
                              −{stage.dropoff_from_previous_pct.toFixed(0)}%
                            </span>
                          ) : null}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-200/70">
                        <div
                          className="h-full rounded-full bg-zinc-800/85 transition-all duration-700 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50/20 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Won revenue
              </h4>
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-400">
              {data.meta.revenue_trend_basis?.replace(/_/g, " ") ?? "By period"}
            </p>
            <div className="mt-4">
              <RevenueTrendChart points={revenue_trend} />
            </div>
          </div>
        </section>

        {/* —— 3. Team (compact leaderboard) —— */}
        <section className="mt-5" aria-labelledby="analytics-team-heading">
          <div className="mb-2 flex items-end justify-between gap-2">
            <div>
              <h4
                id="analytics-team-heading"
                className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
              >
                Team
              </h4>
              <p className="text-[11px] text-zinc-400">Assignee, else creator</p>
            </div>
          </div>
          {team_performance.length === 0 ? (
            <EmptyBlock
              title="No attributed owners yet"
              body="When visible deals have an assignee or creator, performance rolls up here."
            />
          ) : (
            <ul className="space-y-1.5">
              {team_performance.map((row) => (
                <TeamRow key={row.user_id} row={row} />
              ))}
            </ul>
          )}
        </section>

        {/* —— 4. Operational feed (compact) —— */}
        <section className="mt-5 border-t border-zinc-100 pt-5" aria-labelledby="analytics-feed-heading">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4
                id="analytics-feed-heading"
                className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
              >
                Recent activity
              </h4>
              <p className="text-[11px] text-zinc-400">Latest on visible deals</p>
            </div>
            <button
              type="button"
              disabled
              title="Coming soon"
              className="text-[11px] font-medium text-zinc-400 cursor-not-allowed"
            >
              View all activity
            </button>
          </div>

          {activityPreview.length === 0 ? (
            <EmptyBlock
              className="mt-3"
              title="Nothing recent"
              body="Notes, tasks, and stage changes on your deals will surface here."
            />
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-100 bg-zinc-50/30">
              {activityPreview.map((item) => (
                <li key={item.id}>
                  <ActivityRow item={item} />
                </li>
              ))}
            </ul>
          )}
          {hasMoreActivity ? (
            <p className="mt-2 text-center text-[10px] text-zinc-400">
              Showing {ACTIVITY_PREVIEW} of {recent_activity.length}
            </p>
          ) : null}
        </section>

        {loading && data ? (
          <p className="mt-4 text-center text-[10px] font-medium text-zinc-400">Updating…</p>
        ) : null}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  hint,
  value,
  accent,
}: {
  label: string;
  hint?: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 transition ${
        accent
          ? "border-emerald-200/70 bg-emerald-50/35"
          : "border-zinc-200/70 bg-white hover:border-zinc-300/80"
      }`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[10px] leading-tight text-zinc-400" title={hint}>
          {hint}
        </p>
      ) : null}
      <p className="mt-1 text-[15px] font-semibold tabular-nums tracking-tight text-zinc-900">
        {value}
      </p>
    </div>
  );
}

function TeamRow({ row }: { row: AnalyticsV1TeamRow }) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-zinc-100 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-zinc-900">{row.email}</p>
        <p className="text-[10px] text-zinc-400">Member</p>
      </div>
      <dl className="grid grid-cols-4 gap-2 sm:shrink-0 sm:gap-3">
        <StatPill k="Won" v={String(row.deals_won)} />
        <StatPill k="Active" v={String(row.deals_active)} />
        <StatPill k="Revenue" v={formatUsd(row.revenue_won)} narrow />
        <StatPill k="Stale" v={String(row.stale_deals)} warn={row.stale_deals > 0} />
      </dl>
    </li>
  );
}

function StatPill({
  k,
  v,
  narrow,
  warn,
}: {
  k: string;
  v: string;
  narrow?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="text-center">
      <dt
        className={`text-[9px] font-medium uppercase tracking-wide ${
          warn ? "text-amber-700/90" : "text-zinc-400"
        }`}
      >
        {k}
      </dt>
      <dd
        className={`mt-0.5 text-[11px] font-semibold tabular-nums text-zinc-800 ${
          narrow ? "truncate" : ""
        }`}
        title={v}
      >
        {v}
      </dd>
    </div>
  );
}

function ActivityRow({ item }: { item: AnalyticsV1FeedItem }) {
  const label = feedLabel(item);
  const initials = label.replace(/[^A-Za-z]/g, "").slice(0, 1).toUpperCase() || "•";
  return (
    <div className="flex gap-2.5 px-2.5 py-2 sm:px-3">
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold ring-1 ring-inset ${feedTone(item)}`}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-xs font-medium text-zinc-900">{label}</span>
          <time
            className="text-[10px] font-medium tabular-nums text-zinc-400"
            dateTime={item.created_at}
          >
            {formatShortTime(item.created_at)}
          </time>
        </div>
        <p className="truncate text-[10px] text-zinc-500">
          {item.deal_title ? (
            <span className="font-medium text-zinc-600">{item.deal_title}</span>
          ) : null}
          {item.deal_title && item.author_email ? " · " : null}
          {item.author_email ?? (item.author_id ? `User ${item.author_id}` : "")}
        </p>
        {item.content ? (
          <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-zinc-500">
            {item.content}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function EmptyBlock({
  title,
  body,
  className = "",
}: {
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-6 text-center ${className}`}
    >
      <p className="text-xs font-medium text-zinc-700">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-[11px] leading-relaxed text-zinc-500">{body}</p>
    </div>
  );
}
