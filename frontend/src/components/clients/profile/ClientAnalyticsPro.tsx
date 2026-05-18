"use client";

import ProFeatureGate from "@/src/components/billing/ProFeatureGate";
import { formatMoney } from "@/src/lib/formatRelative";
import type { ClientProfileMetrics } from "@/src/types";

function MiniBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </span>
        <span className="text-xs font-semibold text-zinc-800">{formatMoney(value)}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200/80">
        <div
          className="h-full rounded-full bg-violet-500/70 transition-all"
          style={{ width: `${Math.max(pct, value > 0 ? 8 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function ClientAnalyticsPreview() {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {[72, 48, 86].map((h, i) => (
          <div
            key={i}
            className="flex items-end rounded-lg bg-zinc-100 px-2 pb-1 pt-6"
          >
            <div
              className="w-full rounded bg-blue-200/80"
              style={{ height: `${h}px` }}
            />
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-zinc-500">
        Revenue trend · deal velocity · engagement score
      </p>
    </>
  );
}

function ClientAnalyticsContent({ metrics }: { metrics: ClientProfileMetrics }) {
  const maxBar = Math.max(
    metrics.total_revenue,
    metrics.average_deal_size,
    1
  );

  return (
    <>
      <p className="text-xs text-zinc-500">
        Per-account rollup from visible deals — deeper cohort views ship with billing.
      </p>
      <div className="mt-4 space-y-2">
        <MiniBar label="Total revenue" value={metrics.total_revenue} max={maxBar} />
        <MiniBar
          label="Avg deal size"
          value={metrics.average_deal_size}
          max={maxBar}
        />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-zinc-50 px-2 py-3">
          <p className="text-lg font-semibold text-zinc-900">{metrics.won_deals}</p>
          <p className="text-[10px] text-zinc-500">Won</p>
        </div>
        <div className="rounded-lg bg-zinc-50 px-2 py-3">
          <p className="text-lg font-semibold text-zinc-900">{metrics.active_deals}</p>
          <p className="text-[10px] text-zinc-500">Active</p>
        </div>
        <div className="rounded-lg bg-zinc-50 px-2 py-3">
          <p className="text-lg font-semibold text-zinc-900">{metrics.total_deals}</p>
          <p className="text-[10px] text-zinc-500">All deals</p>
        </div>
      </div>
      <p className="mt-4 text-[11px] text-zinc-400">
        Last activity:{" "}
        {metrics.last_activity_at
          ? new Date(metrics.last_activity_at).toLocaleString()
          : "—"}
      </p>
    </>
  );
}

export default function ClientAnalyticsPro({
  metrics,
}: {
  metrics: ClientProfileMetrics;
}) {
  return (
    <ProFeatureGate
      feature="clientDeepAnalytics"
      title="Client analytics"
      paywallTitle="Deep client analytics — trends, cohorts, and forecast-ready insights"
      paywallDescription="Unlock per-account revenue curves and team engagement benchmarks."
      preview={<ClientAnalyticsPreview />}
    >
      <ClientAnalyticsContent metrics={metrics} />
    </ProFeatureGate>
  );
}
