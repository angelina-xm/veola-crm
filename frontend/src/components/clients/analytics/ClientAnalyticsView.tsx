"use client";

import Link from "next/link";
import {
  AnalyticsErrorCard,
  AnalyticsLoadingCard,
  RevenueTrendChart,
  formatUsd,
} from "@/src/components/analytics/analyticsPrimitives";
import { cn } from "@/src/lib/cn";
import { ROUTES } from "@/src/lib/product";
import type { ClientCommercialAnalytics } from "@/src/types";
import { KpiCard } from "./clientAnalyticsShared";
import { useTranslation } from "@/src/context/LocaleContext";

export default function ClientAnalyticsView({
  data,
  loading,
  error,
  highlightClientId,
  onRetry,
}: {
  data: ClientCommercialAnalytics | null;
  loading: boolean;
  error: string | null;
  highlightClientId: string | null;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  if (loading && !data) return <AnalyticsLoadingCard />;
  if (error && !data) return <AnalyticsErrorCard error={error} onRetry={onRetry} />;
  if (!data) return null;

  const { summary } = data;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("clients.totalClientRevenue")}
          value={formatUsd(summary.total_revenue)}
          hint={t("clients.payingAccounts", { count: summary.clients_with_revenue })}
        />
        <KpiCard
          label={t("clients.avgPerClient")}
          value={formatUsd(summary.avg_revenue_per_client)}
        />
        <KpiCard
          label={t("clients.wonDeals")}
          value={String(summary.total_won_deals)}
          hint={t("clients.lostDealsCount", { count: summary.total_lost_deals })}
        />
        <KpiCard
          label={t("clients.productRelationships")}
          value={String(summary.active_product_links)}
          hint={t("clients.productRelationshipsHint")}
        />
      </div>

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
        <h3 className="text-sm font-semibold text-zinc-900">{t("clients.revenueTrendTitle")}</h3>
        <p className="mt-0.5 text-xs text-zinc-500">{t("clients.revenueTrendSub")}</p>
        <div className="mt-4">
          <RevenueTrendChart points={data.revenue_trend} chartHeightPx={128} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
          <h3 className="text-sm font-semibold text-zinc-900">{t("clients.topProducts")}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">{t("clients.topProductsSub")}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="pb-2 pr-3">{t("clients.colProduct")}</th>
                  <th className="pb-2 pr-3 text-right">{t("clients.colRevenue")}</th>
                  <th className="pb-2 text-right">{t("clients.colClients")}</th>
                </tr>
              </thead>
              <tbody>
                {data.top_products.slice(0, 8).map((p) => (
                  <tr key={p.product_id} className="border-b border-zinc-50">
                    <td className="py-2 pr-3">
                      <Link
                        href={`${ROUTES.products}/${p.product_id}`}
                        className="font-medium text-zinc-900 hover:text-[var(--vx-accent)]"
                      >
                        {p.product_name}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {formatUsd(p.revenue)}
                    </td>
                    <td className="py-2 text-right tabular-nums">{p.unique_clients}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
          <h3 className="text-sm font-semibold text-zinc-900">{t("clients.topCategories")}</h3>
          <ul className="mt-4 space-y-2">
            {data.top_categories.slice(0, 8).map((cat) => (
              <li
                key={cat.category}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-50"
              >
                <span className="font-medium text-zinc-800">{cat.category}</span>
                <span className="text-xs tabular-nums text-zinc-600">
                  {formatUsd(cat.revenue)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
        <h3 className="text-sm font-semibold text-zinc-900">{t("clients.clientComparison")}</h3>
        <p className="mt-0.5 text-xs text-zinc-500">{t("clients.clientComparisonSub")}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                <th className="pb-2 pr-3">{t("clients.colClient")}</th>
                <th className="pb-2 pr-3 text-right">{t("clients.colRevenue")}</th>
                <th className="pb-2 pr-3 text-right">{t("clients.colWinPct")}</th>
                <th className="pb-2 pr-3 text-right">{t("clients.colActive")}</th>
                <th className="pb-2 pr-3">{t("clients.colHealth")}</th>
                <th className="pb-2">{t("clients.colCategories")}</th>
              </tr>
            </thead>
            <tbody>
              {data.client_comparison.map((row) => {
                const highlighted =
                  highlightClientId && String(row.client_id) === highlightClientId;
                return (
                  <tr
                    key={row.client_id}
                    className={cn(
                      "border-b border-zinc-50",
                      highlighted && "bg-violet-50/50"
                    )}
                  >
                    <td className="py-2.5 pr-3">
                      <Link
                        href={`${ROUTES.clients}/${row.client_id}`}
                        className="font-medium text-zinc-900 hover:text-[var(--vx-accent)]"
                      >
                        {row.client_name}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      {formatUsd(row.total_revenue)}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      {row.win_rate_pct}%
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      {row.active_deals}
                    </td>
                    <td className="py-2.5 pr-3 capitalize text-zinc-600">
                      {row.relationship_health}
                    </td>
                    <td className="py-2.5 text-xs text-zinc-500">
                      {row.categories.slice(0, 2).join(", ") || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
