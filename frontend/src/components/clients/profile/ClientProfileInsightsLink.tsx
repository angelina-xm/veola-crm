"use client";

import Link from "next/link";
import { formatMoney } from "@/src/lib/formatRelative";
import { ROUTES } from "@/src/lib/product";
import type { ClientProfileMetrics } from "@/src/types";
import { useTranslation } from "@/src/context/LocaleContext";

export default function ClientProfileInsightsLink({
  clientId,
  metrics,
}: {
  clientId: string;
  metrics: ClientProfileMetrics;
}) {
  const { t } = useTranslation();

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
      <h2 className="text-sm font-semibold text-[var(--vx-text)]">
        {t("clients.relationshipSnapshot")}
      </h2>
      <p className="mt-0.5 text-xs text-zinc-500">{t("clients.snapshotRollupHint")}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-zinc-50/80 px-3 py-2">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            {t("clients.totalRevenue")}
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-zinc-900">
            {formatMoney(metrics.total_revenue)}
          </dd>
        </div>
        <div className="rounded-lg bg-zinc-50/80 px-3 py-2">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            {t("clients.wonDeals")}
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-zinc-900">{metrics.won_deals}</dd>
        </div>
      </dl>
      <Link
        href={`${ROUTES.clientsAnalytics}?highlight=${clientId}`}
        className="mt-4 inline-flex text-sm font-medium text-[var(--vx-accent)] hover:underline"
      >
        {t("clients.openClientAnalytics")}
      </Link>
    </section>
  );
}
