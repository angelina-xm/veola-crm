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

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-[var(--vx-shadow-card)]">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function HealthDot({ health }: { health: string }) {
  const tone =
    health === "healthy"
      ? "bg-emerald-500"
      : health === "attention"
        ? "bg-amber-500"
        : health === "dormant"
          ? "bg-zinc-400"
          : "bg-zinc-300";
  return <span className={cn("inline-block h-2 w-2 rounded-full", tone)} />;
}

function LeaderboardCard({
  title,
  rows,
  valueKey,
}: {
  title: string;
  rows: ClientCommercialAnalytics["leaderboards"]["most_profitable"];
  valueKey: "total_revenue" | "activity_count" | "revenue_growth_pct";
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No data yet</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row, i) => (
            <li key={row.client_id}>
              <Link
                href={`${ROUTES.clients}/${row.client_id}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-50"
              >
                <span className="w-5 text-xs font-medium text-zinc-400">{i + 1}</span>
                <HealthDot health={row.relationship_health} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">
                  {row.client_name}
                </span>
                <span className="text-xs font-semibold tabular-nums text-zinc-700">
                  {valueKey === "total_revenue"
                    ? formatUsd(row.total_revenue)
                    : valueKey === "revenue_growth_pct"
                      ? `${row.revenue_growth_pct > 0 ? "+" : ""}${row.revenue_growth_pct}%`
                      : row.activity_count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ClientCommercialWorkspace({
  data,
  loading,
  error,
  highlightClientId,
  productFilter,
  onProductFilter,
  onClearFilters,
  onRetry,
}: {
  data: ClientCommercialAnalytics | null;
  loading: boolean;
  error: string | null;
  highlightClientId: string | null;
  productFilter: string;
  onProductFilter: (productId: string) => void;
  onClearFilters: () => void;
  onRetry: () => void;
}) {
  if (loading && !data) {
    return <AnalyticsLoadingCard />;
  }
  if (error && !data) {
    return <AnalyticsErrorCard error={error} onRetry={onRetry} />;
  }
  if (!data) return null;

  const { summary } = data;
  const filterActive = Boolean(productFilter);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-zinc-600">
            Product lens
            <select
              value={productFilter}
              onChange={(e) => onProductFilter(e.target.value)}
              className="ml-2 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
            >
              <option value="">All products</option>
              {data.catalog_filter_options.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.category ? ` (${p.category})` : ""}
                </option>
              ))}
            </select>
          </label>
          {filterActive ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
            >
              Clear filter
            </button>
          ) : null}
        </div>
        <p className="text-xs text-zinc-400">
          Updated {new Date(data.generated_at).toLocaleString()}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total client revenue"
          value={formatUsd(summary.total_revenue)}
          hint={`${summary.clients_with_revenue} paying accounts`}
        />
        <KpiCard
          label="Avg per client"
          value={formatUsd(summary.avg_revenue_per_client)}
        />
        <KpiCard
          label="Won deals"
          value={String(summary.total_won_deals)}
          hint={`${summary.total_lost_deals} lost`}
        />
        <KpiCard
          label="Product relationships"
          value={String(summary.active_product_links)}
          hint="Catalog links across clients"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
          <h3 className="text-sm font-semibold text-zinc-900">Revenue trend</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Won deal value by month</p>
          <div className="mt-4">
            <RevenueTrendChart points={data.revenue_trend} chartHeightPx={120} />
          </div>
        </div>
        <LeaderboardCard
          title="Most profitable"
          rows={data.leaderboards.most_profitable}
          valueKey="total_revenue"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <LeaderboardCard
          title="Most active"
          rows={data.leaderboards.most_active}
          valueKey="activity_count"
        />
        <LeaderboardCard
          title="Fastest growing (90d)"
          rows={data.leaderboards.fastest_growing}
          valueKey="revenue_growth_pct"
        />
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
          <h3 className="text-sm font-semibold text-zinc-900">Top categories</h3>
          <ul className="mt-3 space-y-2">
            {data.top_categories.slice(0, 6).map((cat) => (
              <li
                key={cat.category}
                className="flex items-center justify-between text-sm"
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

      {filterActive && data.product_buyers.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
            <h3 className="text-sm font-semibold text-zinc-900">Top buyers (filtered)</h3>
            <ul className="mt-3 space-y-2">
              {data.product_buyers.map((row) => (
                <li key={row.client_id}>
                  <Link
                    href={`${ROUTES.clients}/${row.client_id}`}
                    className="flex items-center gap-2 text-sm hover:text-[var(--vx-accent)]"
                  >
                    <HealthDot health={row.relationship_health} />
                    <span className="flex-1 font-medium">{row.client_name}</span>
                    <span className="tabular-nums text-zinc-600">
                      {formatUsd(row.total_revenue)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {data.at_risk_buyers.length > 0 ? (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/30 p-5">
              <h3 className="text-sm font-semibold text-amber-950">
                Haven&apos;t bought recently
              </h3>
              <p className="mt-0.5 text-xs text-amber-800/80">
                Linked or historical buyers with low recent activity
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
      ) : null}

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
        <h3 className="text-sm font-semibold text-zinc-900">Top products</h3>
        <p className="mt-0.5 text-xs text-zinc-500">From deal line items — sales context</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                <th className="pb-2 pr-4">Product</th>
                <th className="pb-2 pr-4">Category</th>
                <th className="pb-2 pr-4 text-right">Revenue</th>
                <th className="pb-2 pr-4 text-right">Deals</th>
                <th className="pb-2 text-right">Clients</th>
              </tr>
            </thead>
            <tbody>
              {data.top_products.map((p) => (
                <tr key={p.product_id} className="border-b border-zinc-50">
                  <td className="py-2.5 pr-4">
                    <Link
                      href={`${ROUTES.products}/${p.product_id}`}
                      className="font-medium text-zinc-900 hover:text-[var(--vx-accent)]"
                    >
                      {p.product_name}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-zinc-600">{p.category || "—"}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {formatUsd(p.revenue)}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{p.deal_count}</td>
                  <td className="py-2.5 text-right tabular-nums">{p.unique_clients}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
        <h3 className="text-sm font-semibold text-zinc-900">Client comparison</h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          Revenue, deal success, and relationship health
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                <th className="pb-2 pr-3">Client</th>
                <th className="pb-2 pr-3 text-right">Revenue</th>
                <th className="pb-2 pr-3 text-right">Avg deal</th>
                <th className="pb-2 pr-3 text-right">Win %</th>
                <th className="pb-2 pr-3 text-right">Active</th>
                <th className="pb-2 pr-3">Health</th>
                <th className="pb-2">Categories</th>
              </tr>
            </thead>
            <tbody>
              {data.client_comparison.map((row) => {
                const highlighted =
                  highlightClientId &&
                  String(row.client_id) === highlightClientId;
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
                      {formatUsd(row.average_deal_size)}
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
