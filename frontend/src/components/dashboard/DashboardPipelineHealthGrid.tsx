"use client";

import Link from "next/link";
import { cn } from "@/src/lib/cn";
import { formatMoney } from "@/src/lib/formatRelative";
import { ROUTES } from "@/src/lib/product";
import type { AnalyticsV1Kpis, PipelineHealth } from "@/src/types";
import { useTranslation } from "@/src/context/LocaleContext";

type Metric = {
  key: string;
  value: string;
  label: string;
  barPct: number;
  valueClass?: string;
  barClass: string;
};

function MetricCell({ m, loading }: { m: Metric; loading?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg bg-[var(--vx-bg-subtle)] p-3">
      <p
        className={cn(
          "text-[22px] font-bold leading-none tracking-tight vx-tabular",
          m.valueClass ?? "text-[var(--vx-text)]"
        )}
      >
        {loading ? t("common.notAvailable") : m.value}
      </p>
      <p className="mt-1 text-[11px] text-[var(--vx-text-muted)]">{m.label}</p>
      <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-[var(--vx-border)]">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", m.barClass)}
          style={{ width: loading ? "0%" : `${m.barPct}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardPipelineHealthGrid({
  kpis,
  health,
  loading,
}: {
  kpis: AnalyticsV1Kpis | null;
  health: PipelineHealth | null;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const winRate = kpis?.conversion_rate_pct ?? 0;
  const pipelineVal = kpis?.pipeline_value ?? "0";
  const stale = kpis?.stale_health?.stale ?? 0;
  const atRisk = health?.at_risk ?? 0;
  const healthy = health?.healthy ?? 0;
  const total = health?.total_operational ?? kpis?.active_deals ?? 1;

  const metrics: Metric[] = [
    {
      key: "win",
      value: `${Math.round(winRate)}%`,
      label: t("dashboardStats.winRate"),
      barPct: Math.min(100, winRate),
      valueClass: "text-emerald-400",
      barClass: "bg-emerald-500",
    },
    {
      key: "pipe",
      value: formatMoney(pipelineVal),
      label: t("dashboardStats.pipelineValue"),
      barPct:
        kpis && kpis.visible_deals_total > 0
          ? Math.min(100, (kpis.active_deals / kpis.visible_deals_total) * 100)
          : 40,
      barClass: "bg-[var(--vx-accent)]",
    },
    {
      key: "healthy",
      value: String(healthy),
      label: t("dashboardStats.onTrack"),
      barPct: total > 0 ? Math.round((healthy / total) * 100) : 0,
      valueClass: "text-amber-400",
      barClass: "bg-amber-500",
    },
    {
      key: "risk",
      value: String(atRisk + stale),
      label: t("dashboardStats.atRisk"),
      barPct: total > 0 ? Math.min(100, ((atRisk + stale) / total) * 100) : 0,
      valueClass: atRisk + stale > 0 ? "text-rose-400" : undefined,
      barClass: "bg-rose-500",
    },
  ];

  return (
    <section className="vx-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold text-[var(--vx-text)]">
          {t("dashboardStats.pipelineHealthTitle")}
        </h2>
        <Link
          href={ROUTES.deals}
          className="text-[11px] font-medium text-[var(--vx-accent)] hover:text-[var(--vx-accent-hover)]"
        >
          {t("copy.viewDeals")}
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {metrics.map((m) => (
          <MetricCell key={m.key} m={m} loading={loading} />
        ))}
      </div>
    </section>
  );
}
