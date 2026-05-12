"use client";

import type {
  AnalyticsGranularity,
  AnalyticsV1FeedItem,
  AnalyticsV1Overview,
} from "@/src/types";

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
      return item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : "Activity";
  }
}

function RevenueTrendChart({
  points,
}: {
  points: { period_start: string; revenue: string }[];
}) {
  if (points.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-8 text-center text-sm text-gray-500">
        No won revenue in this window yet.
      </p>
    );
  }
  const values = points.map((p) => Number.parseFloat(p.revenue));
  const max = Math.max(1, ...values.map((v) => (Number.isFinite(v) ? v : 0)));
  const w = 360;
  const h = 120;
  const pad = 8;
  const barW = Math.max(4, (w - pad * 2) / points.length - 4);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-36 w-full max-w-full text-indigo-500"
      role="img"
      aria-label="Revenue trend"
    >
      {points.map((p, i) => {
        const v = Number.parseFloat(p.revenue);
        const safe = Number.isFinite(v) ? v : 0;
        const bh = (safe / max) * (h - pad * 2);
        const x = pad + i * ((w - pad * 2) / Math.max(1, points.length));
        const y = h - pad - bh;
        const label = p.period_start
          ? new Date(p.period_start).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })
          : "";
        return (
          <g key={`${p.period_start}-${i}`}>
            <title>{`${label}: ${formatUsd(p.revenue)}`}</title>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(2, bh)}
              rx={3}
              className="fill-current opacity-90"
            />
          </g>
        );
      })}
    </svg>
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
  if (loading && !data) {
    return (
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center justify-center gap-3 text-gray-500">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600" />
          <p className="text-sm">Loading analytics…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/80 px-5 py-4 text-red-900">
        <p className="text-sm font-medium">Analytics unavailable</p>
        <p className="mt-1 text-sm opacity-90">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg bg-red-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-800"
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

  return (
    <div className="mb-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">
            Sales overview
          </h2>
          <p className="text-sm text-gray-500">
            What is happening with sales right now — scoped to deals you can see.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1">
          {(["week", "month"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onGranularityChange(g)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                granularity === g
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {g === "week" ? "Weekly trend" : "Monthly trend"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Pipeline value"
          sub="Active deals"
          value={formatUsd(kpis.pipeline_value)}
        />
        <KpiCard label="Active deals" value={String(kpis.active_deals)} />
        <KpiCard
          label="Conversion"
          sub="Won / visible"
          value={formatPct(kpis.conversion_rate_pct)}
        />
        <KpiCard
          label="Pipeline health"
          sub="Healthy · At risk · Stale"
          value={`${kpis.stale_health.healthy} · ${kpis.stale_health.at_risk} · ${kpis.stale_health.stale}`}
        />
        <KpiCard
          label="Won this month"
          sub={formatUsd(kpis.won_this_month_revenue)}
          value={`${kpis.won_this_month} deals`}
          accent="emerald"
        />
        <KpiCard
          label="Avg deal size"
          value={formatUsd(kpis.average_deal_size)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">Pipeline funnel</h3>
          <p className="mt-0.5 text-xs text-gray-500">Deal count per stage · drop-off vs previous</p>
          <ul className="mt-4 space-y-3">
            {funnel.length === 0 ? (
              <li className="text-sm text-gray-500">No stages configured.</li>
            ) : (
              funnel.map((stage) => (
                <li key={stage.stage_id}>
                  <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
                    <span className="font-medium text-gray-800">{stage.name}</span>
                    <span>
                      {stage.deal_count}
                      {stage.dropoff_from_previous_pct != null ? (
                        <span className="ml-2 text-amber-700">
                          −{stage.dropoff_from_previous_pct.toFixed(0)}%
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-indigo-500/90 transition-[width]"
                      style={{
                        width: `${Math.round((stage.deal_count / maxFunnel) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">Won revenue trend</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {data.meta.revenue_trend_basis?.replace(/_/g, " ") ?? "Bucketed trend"}
          </p>
          <div className="mt-4 text-indigo-600">
            <RevenueTrendChart points={revenue_trend} />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Team performance</h3>
        <p className="mt-0.5 text-xs text-gray-500">Attributed to assignee, else creator</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-4 font-medium">Member</th>
                <th className="py-2 pr-4 font-medium">Won</th>
                <th className="py-2 pr-4 font-medium">Active</th>
                <th className="py-2 pr-4 font-medium">Won revenue</th>
                <th className="py-2 font-medium">Stale</th>
              </tr>
            </thead>
            <tbody>
              {team_performance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-500">
                    No team rows for visible deals.
                  </td>
                </tr>
              ) : (
                team_performance.map((row) => (
                  <tr key={row.user_id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-4 font-medium text-gray-900">{row.email}</td>
                    <td className="py-2 pr-4 text-gray-700">{row.deals_won}</td>
                    <td className="py-2 pr-4 text-gray-700">{row.deals_active}</td>
                    <td className="py-2 pr-4 text-gray-700">{formatUsd(row.revenue_won)}</td>
                    <td className="py-2 text-gray-700">{row.stale_deals}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Recent activity</h3>
        <p className="mt-0.5 text-xs text-gray-500">Visible deals & company timeline</p>
        <ul className="mt-4 divide-y divide-gray-100">
          {recent_activity.length === 0 ? (
            <li className="py-6 text-center text-sm text-gray-500">No recent activity.</li>
          ) : (
            recent_activity.map((item) => (
              <li key={item.id} className="flex gap-3 py-3 first:pt-0">
                <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-gray-100 text-center text-xs font-semibold leading-8 text-gray-600">
                  {feedLabel(item).charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{feedLabel(item)}</p>
                  <p className="truncate text-xs text-gray-500">
                    {item.deal_title ? `${item.deal_title} · ` : ""}
                    {item.author_email ?? `User #${item.author_id}`}
                    {" · "}
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString()
                      : ""}
                  </p>
                  {item.content ? (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-600">{item.content}</p>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      {loading && data ? (
        <p className="text-center text-xs text-gray-400">Refreshing…</p>
      ) : null}
    </div>
  );
}

function KpiCard({
  label,
  sub,
  value,
  accent,
}: {
  label: string;
  sub?: string;
  value: string;
  accent?: "emerald";
}) {
  const ring =
    accent === "emerald"
      ? "border-emerald-200/80 bg-emerald-50/40"
      : "border-gray-200/80 bg-white";
  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${ring}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      {sub ? <p className="text-[10px] text-gray-400">{sub}</p> : null}
      <p className="mt-2 text-lg font-semibold tracking-tight text-gray-900">{value}</p>
    </div>
  );
}
