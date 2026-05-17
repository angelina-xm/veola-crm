"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { AnalyticsV1Overview } from "@/src/types";
import {
  ActivityRow,
  AnalyticsErrorCard,
  AnalyticsLoadingCard,
  EmptyBlock,
  FunnelStagesList,
  formatPct,
  formatUsd,
  KpiCard,
} from "./analyticsPrimitives";

const PIPELINE_ACTIVITY = 5;

export default function PipelineAnalyticsCompact({
  data,
  loading,
  error,
  onRetry,
}: {
  data: AnalyticsV1Overview | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const activitySlice = useMemo(
    () => (data?.recent_activity ?? []).slice(0, PIPELINE_ACTIVITY),
    [data?.recent_activity]
  );

  if (loading && !data) {
    return <AnalyticsLoadingCard />;
  }

  if (error) {
    return <AnalyticsErrorCard error={error} onRetry={onRetry} />;
  }

  if (!data) {
    return null;
  }

  const { kpis, funnel, recent_activity } = data;

  return (
    <div className="mb-5 rounded-xl border border-zinc-200/70 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-2 border-b border-zinc-100 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Overview</h2>
          <p className="text-[11px] text-zinc-500">Quick read on your active deals</p>
        </div>
        <Link
          href="/analytics"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-[11px] font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-white"
        >
          Open analytics
          <span aria-hidden className="text-zinc-400">
            →
          </span>
        </Link>
      </div>

      <div className="space-y-4 px-3 py-3 sm:px-4 sm:py-4">
        <section aria-label="Key metrics">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard
              label="Open value"
              hint="Active deals"
              value={formatUsd(kpis.pipeline_value)}
            />
            <KpiCard label="Active" value={String(kpis.active_deals)} />
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
              label="Won (mo)"
              hint={formatUsd(kpis.won_this_month_revenue)}
              value={kpis.won_this_month === 1 ? "1 deal" : `${kpis.won_this_month} deals`}
              accent
            />
            <KpiCard label="Avg deal" value={formatUsd(kpis.average_deal_size)} />
          </div>
        </section>

        <section className="rounded-lg border border-zinc-100 bg-zinc-50/30 p-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Funnel
          </h3>
          <div className="mt-2 max-h-[220px] overflow-y-auto pr-1">
            <FunnelStagesList funnel={funnel} compact />
          </div>
        </section>

        <section>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Recent activity
            </h3>
            <Link href="/analytics" className="text-[10px] font-medium text-zinc-500 hover:text-zinc-800">
              More in analytics
            </Link>
          </div>
          {activitySlice.length === 0 ? (
            <EmptyBlock
              title="Nothing recent"
              body="Stage moves and tasks will show here."
              className="py-4"
            />
          ) : (
            <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-100 bg-zinc-50/20">
              {activitySlice.map((item) => (
                <li key={item.id}>
                  <ActivityRow item={item} dense />
                </li>
              ))}
            </ul>
          )}
          {recent_activity.length > PIPELINE_ACTIVITY ? (
            <p className="mt-1.5 text-center text-[10px] text-zinc-400">
              +{recent_activity.length - PIPELINE_ACTIVITY} more in workspace
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
