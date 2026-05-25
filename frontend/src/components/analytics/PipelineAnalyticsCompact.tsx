"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { AnalyticsV1Overview } from "@/src/types";
import { useTranslation } from "@/src/context/LocaleContext";
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
  const { t } = useTranslation();
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
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold tracking-tight text-zinc-900">
            {t("pipelineCompact.overview")}
          </h2>
          <p className="text-[11px] text-zinc-500">{t("pipelineCompact.overviewHint")}</p>
        </div>
        <Link
          href="/analytics"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-[11px] font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-white"
        >
          {t("pipelineCompact.openAnalytics")}
          <span aria-hidden className="text-zinc-400">
            →
          </span>
        </Link>
      </div>

      <div className="space-y-4 px-3 py-3 sm:px-4 sm:py-4">
        <section aria-label={t("pipelineCompact.keyMetricsAria")}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard
              label={t("analyticsWorkspace.openValue")}
              hint={t("pipelineCompact.kpiActiveHint")}
              value={formatUsd(kpis.pipeline_value)}
            />
            <KpiCard label={t("pipelineCompact.kpiActiveShort")} value={String(kpis.active_deals)} />
            <KpiCard
              label={t("analyticsWorkspace.conversion")}
              hint={t("analyticsWorkspace.conversionHint")}
              value={formatPct(kpis.conversion_rate_pct)}
            />
            <KpiCard
              label={t("pipelineCompact.kpiHealth")}
              hint={t("analyticsWorkspace.staleHint")}
              value={`${kpis.stale_health.healthy} · ${kpis.stale_health.at_risk} · ${kpis.stale_health.stale}`}
            />
            <KpiCard
              label={t("pipelineCompact.kpiWonMo")}
              hint={formatUsd(kpis.won_this_month_revenue)}
              value={
                kpis.won_this_month === 1
                  ? t("analyticsWorkspace.oneDeal")
                  : t("analyticsWorkspace.dealsCount", { count: kpis.won_this_month })
              }
              accent
            />
            <KpiCard
              label={t("pipelineCompact.kpiAvgDeal")}
              value={formatUsd(kpis.average_deal_size)}
            />
          </div>
        </section>

        <section className="rounded-lg border border-zinc-100 bg-zinc-50/30 p-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("pipelineCompact.funnel")}
          </h3>
          <div className="mt-2 max-h-[220px] overflow-y-auto pr-1">
            <FunnelStagesList funnel={funnel} compact />
          </div>
        </section>

        <section>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("pipelineCompact.recentActivity")}
            </h3>
            <Link
              href="/analytics"
              className="shrink-0 text-[10px] font-medium text-zinc-500 hover:text-zinc-800"
            >
              {t("pipelineCompact.moreInAnalytics")}
            </Link>
          </div>
          {activitySlice.length === 0 ? (
            <EmptyBlock
              title={t("pipelineCompact.nothingRecentTitle")}
              body={t("pipelineCompact.nothingRecentBody")}
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
              {t("pipelineCompact.moreInWorkspace", {
                count: recent_activity.length - PIPELINE_ACTIVITY,
              })}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
