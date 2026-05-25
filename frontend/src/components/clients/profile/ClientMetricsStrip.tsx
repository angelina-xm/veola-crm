"use client";

import { formatMoney, formatRelative } from "@/src/lib/formatRelative";
import type { ClientProfileMetrics } from "@/src/types";
import { useTranslation } from "@/src/context/LocaleContext";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[5.5rem]">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

export default function ClientMetricsStrip({
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
    <div className="flex flex-wrap gap-6">
      <Stat label={t("clients.customerSince")} value={since} />
      <Stat label={t("clients.revenueShort")} value={formatMoney(metrics.total_revenue)} />
      <Stat label={t("clients.activeDeals")} value={String(metrics.active_deals)} />
      <Stat
        label={t("clients.lastActivity")}
        value={metrics.last_activity_at ? formatRelative(metrics.last_activity_at) : na}
      />
    </div>
  );
}
