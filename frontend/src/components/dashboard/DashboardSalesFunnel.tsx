"use client";

import Link from "next/link";
import { cn } from "@/src/lib/cn";
import { ROUTES } from "@/src/lib/product";
import type { AnalyticsV1FunnelStage } from "@/src/types";

const BAR_COLORS = [
  "bg-[var(--vx-accent)]",
  "bg-indigo-400",
  "bg-teal-500",
  "bg-amber-500",
  "bg-emerald-500",
];

export default function DashboardSalesFunnel({
  stages,
  loading,
}: {
  stages: AnalyticsV1FunnelStage[];
  loading?: boolean;
}) {
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const maxCount = Math.max(...sorted.map((s) => s.deal_count), 1);
  const visible = sorted.filter((s) => s.deal_count > 0).slice(0, 5);

  return (
    <section className="vx-card flex flex-col">
      <div className="vx-card-head">
        <div>
          <h2 className="text-[13px] font-semibold text-[var(--vx-text)]">
            Sales funnel
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--vx-text-muted)]">
            Active deals by stage
          </p>
        </div>
        <Link
          href={ROUTES.deals}
          className="text-xs font-medium text-[var(--vx-accent)] hover:text-[var(--vx-accent-hover)]"
        >
          View deals
        </Link>
      </div>
      <div className="flex-1 px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-[var(--vx-bg-subtle)]" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--vx-text-muted)]">
            No active deals in the funnel yet.
          </p>
        ) : (
          <ul className="space-y-3.5">
            {visible.map((stage, i) => {
              const pct = Math.round((stage.deal_count / maxCount) * 100);
              return (
                <li key={stage.stage_id}>
                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="font-medium text-[var(--vx-text-secondary)]">
                      {stage.name}
                    </span>
                    <span className="font-bold text-[var(--vx-text)] vx-tabular">
                      {stage.deal_count}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--vx-bg-subtle)]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-500",
                        BAR_COLORS[i % BAR_COLORS.length]
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
