"use client";

import { formatMoney } from "@/src/lib/formatRelative";
import { formatRelative } from "@/src/lib/formatRelative";
import type { ClientProfileMetrics } from "@/src/types";

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
  const since = metrics.customer_since
    ? new Date(metrics.customer_since).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div className="flex flex-wrap gap-6">
      <Stat label="Customer since" value={since} />
      <Stat label="Revenue" value={formatMoney(metrics.total_revenue)} />
      <Stat label="Active deals" value={String(metrics.active_deals)} />
      <Stat
        label="Last activity"
        value={
          metrics.last_activity_at
            ? formatRelative(metrics.last_activity_at)
            : "—"
        }
      />
    </div>
  );
}
