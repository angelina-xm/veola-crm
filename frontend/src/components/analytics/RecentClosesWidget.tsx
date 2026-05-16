"use client";

import type { ClosedDealsSummary } from "@/src/types";

function formatUsd(value: string | number): string {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

type Props = {
  data: ClosedDealsSummary | null;
  loading?: boolean;
};

export default function RecentClosesWidget({ data, loading }: Props) {
  if (loading) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">Loading closed deals…</p>
      </section>
    );
  }
  if (!data) return null;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">Closed today</h2>
        <span className="text-xs text-gray-500">Historical — not operational</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-gray-500">Deals closed</dt>
          <dd className="text-lg font-semibold text-gray-900">{data.closed_today_count}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Won today</dt>
          <dd className="text-lg font-semibold text-emerald-700">{data.won_today_count}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Revenue today</dt>
          <dd className="text-lg font-semibold text-gray-900">
            {formatUsd(data.revenue_closed_today)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Won this week</dt>
          <dd className="text-lg font-semibold text-gray-900">
            {formatUsd(data.revenue_closed_this_week)}
          </dd>
        </div>
      </dl>
      {data.recent_wins.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Recent wins
          </h3>
          <ul className="mt-2 divide-y divide-gray-100">
            {data.recent_wins.slice(0, 5).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="truncate font-medium text-gray-800">{d.title}</span>
                <span className="shrink-0 text-emerald-700">{formatUsd(d.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-500">No recent wins yet.</p>
      )}
    </section>
  );
}
