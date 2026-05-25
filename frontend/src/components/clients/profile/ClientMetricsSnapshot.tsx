"use client";

import { formatRelative, formatMoney } from "@/src/lib/formatRelative";
import type { ClientProfileMetrics } from "@/src/types";
import { useTranslation } from "@/src/context/LocaleContext";

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
  const { t } = useTranslation();
  const na = t("common.notAvailable");
  const since = metrics.customer_since
    ? new Date(metrics.customer_since).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : na;

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
      <h2 className="text-sm font-semibold text-zinc-900">
        {t("clients.relationshipSnapshot")}
      </h2>
      <p className="mt-0.5 text-xs text-zinc-500">{t("clients.relationshipSnapshotHint")}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label={t("clients.customerSince")} value={since} />
        <Metric label={t("clients.totalRevenue")} value={formatMoney(metrics.total_revenue)} />
        <Metric label={t("clients.wonDeals")} value={String(metrics.won_deals)} />
        <Metric label={t("clients.activeDeals")} value={String(metrics.active_deals)} />
        <Metric
          label={t("clients.lastActivity")}
          value={
            metrics.last_activity_at ? formatRelative(metrics.last_activity_at) : na
          }
        />
        <Metric label={t("clients.avgDealSize")} value={formatMoney(metrics.average_deal_size)} />
      </div>
    </section>
  );
}
