"use client";

import Link from "next/link";
import { formatUsd } from "@/src/components/analytics/analyticsPrimitives";
import { cn } from "@/src/lib/cn";
import { ROUTES } from "@/src/lib/product";
import type { ClientCommercialAnalytics } from "@/src/types";
import { useTranslation } from "@/src/context/LocaleContext";

export function KpiCard({
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

export function HealthDot({ health }: { health: string }) {
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

export function LeaderboardCard({
  title,
  subtitle,
  rows,
  valueKey,
}: {
  title: string;
  subtitle?: string;
  rows: ClientCommercialAnalytics["leaderboards"]["most_profitable"];
  valueKey: "total_revenue" | "activity_count" | "revenue_growth_pct";
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      {subtitle ? <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p> : null}
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">{t("clients.noDataYet")}</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {rows.map((row, i) => (
            <li key={row.client_id}>
              <Link
                href={`${ROUTES.clients}/${row.client_id}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-zinc-50"
              >
                <span className="w-5 text-xs font-medium tabular-nums text-zinc-400">
                  {i + 1}
                </span>
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

export function ProductLensBar({
  data,
  productFilter,
  onProductFilter,
  onClearFilters,
}: {
  data: ClientCommercialAnalytics;
  productFilter: string;
  onProductFilter: (id: string) => void;
  onClearFilters: () => void;
}) {
  const { t } = useTranslation();
  const filterActive = Boolean(productFilter);
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium text-zinc-600">
          {t("clients.productLens")}
          <select
            value={productFilter}
            onChange={(e) => onProductFilter(e.target.value)}
            className="ml-2 max-w-[min(100%,14rem)] rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm shadow-sm"
          >
            <option value="">{t("clients.allProducts")}</option>
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
            {t("common.clearFilter")}
          </button>
        ) : null}
      </div>
      <p className="text-xs text-zinc-400">
        {t("clients.catalogUpdated", {
          time: new Date(data.generated_at).toLocaleString(),
        })}
      </p>
    </div>
  );
}
