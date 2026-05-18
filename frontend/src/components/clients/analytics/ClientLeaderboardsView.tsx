"use client";

import Link from "next/link";
import {
  AnalyticsErrorCard,
  AnalyticsLoadingCard,
  formatUsd,
} from "@/src/components/analytics/analyticsPrimitives";
import { ROUTES } from "@/src/lib/product";
import type { ClientCommercialAnalytics } from "@/src/types";
import {
  HealthDot,
  LeaderboardCard,
  ProductLensBar,
} from "./clientAnalyticsShared";

export default function ClientLeaderboardsView({
  data,
  loading,
  error,
  productFilter,
  onProductFilter,
  onClearFilters,
  onRetry,
}: {
  data: ClientCommercialAnalytics | null;
  loading: boolean;
  error: string | null;
  productFilter: string;
  onProductFilter: (id: string) => void;
  onClearFilters: () => void;
  onRetry: () => void;
}) {
  if (loading && !data) return <AnalyticsLoadingCard />;
  if (error && !data) return <AnalyticsErrorCard error={error} onRetry={onRetry} />;
  if (!data) return null;

  const filterActive = Boolean(productFilter);

  return (
    <div className="space-y-8">
      <ProductLensBar
        data={data}
        productFilter={productFilter}
        onProductFilter={onProductFilter}
        onClearFilters={onClearFilters}
      />

      <div className="grid gap-6 md:grid-cols-3">
        <LeaderboardCard
          title="Most profitable"
          subtitle="Total won revenue"
          rows={data.leaderboards.most_profitable}
          valueKey="total_revenue"
        />
        <LeaderboardCard
          title="Most active"
          subtitle="Touchpoints logged"
          rows={data.leaderboards.most_active}
          valueKey="activity_count"
        />
        <LeaderboardCard
          title="Fastest growing"
          subtitle="Revenue vs prior 90 days"
          rows={data.leaderboards.fastest_growing}
          valueKey="revenue_growth_pct"
        />
      </div>

      {filterActive ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
            <h3 className="text-sm font-semibold text-zinc-900">Top buyers</h3>
            <p className="mt-0.5 text-xs text-zinc-500">For selected product</p>
            {data.product_buyers.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">No buyers in this lens yet</p>
            ) : (
              <ul className="mt-3 space-y-1">
                {data.product_buyers.map((row, i) => (
                  <li key={row.client_id}>
                    <Link
                      href={`${ROUTES.clients}/${row.client_id}`}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-zinc-50"
                    >
                      <span className="w-5 text-xs font-medium text-zinc-400">
                        {i + 1}
                      </span>
                      <HealthDot health={row.relationship_health} />
                      <span className="flex-1 text-sm font-medium text-zinc-900">
                        {row.client_name}
                      </span>
                      <span className="text-xs tabular-nums text-zinc-600">
                        {formatUsd(row.total_revenue)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {data.at_risk_buyers.length > 0 ? (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/30 p-5">
              <h3 className="text-sm font-semibold text-amber-950">
                Slowing or dormant
              </h3>
              <p className="mt-0.5 text-xs text-amber-800/80">
                Buyers who haven&apos;t engaged recently
              </p>
              <ul className="mt-3 space-y-2">
                {data.at_risk_buyers.map((row) => (
                  <li key={row.client_id}>
                    <Link
                      href={`${ROUTES.clients}/${row.client_id}`}
                      className="text-sm font-medium text-amber-950 hover:underline"
                    >
                      {row.client_name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/40 px-5 py-6 text-center">
          <p className="text-sm text-zinc-600">
            Select a product above to rank buyers and spot accounts that stopped
            ordering.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
        <h3 className="text-sm font-semibold text-zinc-900">By category</h3>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {data.top_categories.map((cat) => (
            <li
              key={cat.category}
              className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/50 px-3 py-2.5 text-sm"
            >
              <span className="font-medium text-zinc-800">{cat.category}</span>
              <span className="text-xs tabular-nums text-zinc-600">
                {formatUsd(cat.revenue)} · {cat.unique_clients} clients
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
