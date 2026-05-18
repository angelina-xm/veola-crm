"use client";

import { formatRelative } from "@/src/lib/formatRelative";
import { formatMoney } from "@/src/lib/formatRelative";
import type { ClientProfileMetrics } from "@/src/types";

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50/40 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export default function ClientMetricsSnapshot({
  metrics,
}: {
  metrics: ClientProfileMetrics;
}) {
  const since = metrics.customer_since
    ? new Date(metrics.customer_since).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
      <h2 className="text-sm font-semibold text-zinc-900">Relationship snapshot</h2>
      <p className="mt-0.5 text-xs text-zinc-500">Compact metrics — not a full analytics wall</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Customer since" value={since} />
        <Metric label="Total revenue" value={formatMoney(metrics.total_revenue)} />
        <Metric label="Won deals" value={String(metrics.won_deals)} />
        <Metric label="Active deals" value={String(metrics.active_deals)} />
        <Metric
          label="Last activity"
          value={
            metrics.last_activity_at
              ? formatRelative(metrics.last_activity_at)
              : "—"
          }
        />
        <Metric
          label="Avg deal size"
          value={formatMoney(metrics.average_deal_size)}
        />
      </div>
    </section>
  );
}

