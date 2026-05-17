"use client";

import type {
  AnalyticsV1FeedItem,
  AnalyticsV1FunnelStage,
  AnalyticsV1TeamRow,
} from "@/src/types";

export function formatUsd(amountStr: string): string {
  const n = Number.parseFloat(amountStr);
  if (!Number.isFinite(n)) return amountStr;
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatPct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

export function formatShortTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function feedLabel(item: AnalyticsV1FeedItem): string {
  switch (item.kind) {
    case "deal_won":
      return "Deal won";
    case "deal_moved":
      return "Deal moved";
    case "note_added":
      return "Note added";
    case "task_completed":
      return "Task completed";
    case "task_open":
      return "Task";
    default:
      return item.type
        ? item.type.charAt(0).toUpperCase() + item.type.slice(1)
        : "Activity";
  }
}

export function feedTone(item: AnalyticsV1FeedItem): string {
  switch (item.kind) {
    case "deal_won":
      return "bg-emerald-500/15 text-emerald-700 ring-emerald-500/20";
    case "deal_moved":
      return "bg-violet-500/10 text-violet-700 ring-violet-500/15";
    case "task_completed":
      return "bg-sky-500/10 text-sky-800 ring-sky-500/15";
    case "note_added":
      return "bg-amber-500/10 text-amber-800 ring-amber-500/15";
    default:
      return "bg-zinc-500/10 text-zinc-600 ring-zinc-500/10";
  }
}

/** Fixed-width columns; avoids a single bar spanning the full chart width. */
export function RevenueTrendChart({
  points,
  chartHeightPx = 96,
}: {
  points: { period_start: string; revenue: string }[];
  chartHeightPx?: number;
}) {
  if (points.length === 0) {
    return (
      <div className="flex min-h-[132px] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 px-5 py-8 text-center">
        <p className="text-sm font-medium tracking-tight text-zinc-800">
          Close your first deal to unlock revenue trends
        </p>
        <p className="mt-2 max-w-[260px] text-xs leading-relaxed text-zinc-500">
          Won deal value over time will appear here once you have closed revenue in
          this window.
        </p>
      </div>
    );
  }

  const values = points.map((p) => Number.parseFloat(p.revenue));
  const numeric = values.map((v) => (Number.isFinite(v) ? v : 0));
  const max = Math.max(1e-9, ...numeric);

  return (
    <div className="w-full">
      <div className="mb-1 flex items-end justify-end">
        <span className="text-[10px] font-medium tabular-nums text-zinc-400">
          Max {formatUsd(String(max))}
        </span>
      </div>
      <div
        className="mx-auto flex max-w-md items-end justify-center gap-2 border-b border-zinc-200/90 pb-px sm:gap-2.5"
        style={{ minHeight: chartHeightPx + 28 }}
        role="img"
        aria-label="Won revenue by period"
      >
        {points.map((p, i) => {
          const v = numeric[i] ?? 0;
          const pxH = v <= 0 ? 0 : Math.max(3, Math.round((v / max) * chartHeightPx));
          const label = p.period_start
            ? new Date(p.period_start).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })
            : "—";
          return (
            <div
              key={`${p.period_start}-${i}`}
              className="flex h-[124px] w-9 flex-col items-stretch justify-end sm:w-10"
            >
              <div className="group relative w-full" title={`${label}: ${formatUsd(p.revenue)}`}>
                <div
                  className="w-full rounded-t-[4px] bg-zinc-800/90 shadow-sm ring-1 ring-zinc-950/5 transition-[height] duration-500 ease-out"
                  style={{ height: pxH }}
                />
              </div>
              <span className="mt-1.5 block text-center text-[10px] font-medium leading-none text-zinc-500">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FunnelStagesList({
  funnel,
  compact = false,
}: {
  funnel: AnalyticsV1FunnelStage[];
  compact?: boolean;
}) {
  const maxFunnel = Math.max(1, ...funnel.map((s) => s.deal_count));
  if (funnel.length === 0) {
    return (
      <EmptyBlock
        title="No funnel stages"
        body="Add deal stages in settings so your board flow appears here."
      />
    );
  }
  return (
    <ul className={compact ? "space-y-2" : "space-y-3.5"}>
      {funnel.map((stage) => {
        const pct = Math.round((stage.deal_count / maxFunnel) * 100);
        return (
          <li key={stage.stage_id} className="group">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`inline-flex min-w-0 items-center gap-2 rounded-md bg-white font-medium text-zinc-800 ring-1 ring-zinc-200/80 ${
                  compact ? "truncate px-1.5 py-0.5 text-[10px]" : "truncate px-2 py-0.5 text-[11px]"
                }`}
              >
                {stage.name}
              </span>
              <span
                className={`shrink-0 font-medium tabular-nums text-zinc-600 ${
                  compact ? "text-[10px]" : "text-[11px]"
                }`}
              >
                {stage.deal_count}
                {stage.dropoff_from_previous_pct != null ? (
                  <span className="ml-1.5 font-normal text-amber-700/90">
                    −{stage.dropoff_from_previous_pct.toFixed(0)}%
                  </span>
                ) : null}
              </span>
            </div>
            <div
              className={`mt-1 overflow-hidden rounded-full bg-zinc-200/70 ${
                compact ? "h-1" : "mt-1.5 h-1.5"
              }`}
            >
              <div
                className="h-full rounded-full bg-zinc-800/85 transition-all duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function KpiCard({
  label,
  hint,
  value,
  accent,
}: {
  label: string;
  hint?: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 transition ${
        accent
          ? "border-emerald-200/70 bg-emerald-50/35"
          : "border-zinc-200/70 bg-white hover:border-zinc-300/80"
      }`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[10px] leading-tight text-zinc-400" title={hint}>
          {hint}
        </p>
      ) : null}
      <p className="mt-1 text-[15px] font-semibold tabular-nums tracking-tight text-zinc-900">
        {value}
      </p>
    </div>
  );
}

export function TeamRow({ row }: { row: AnalyticsV1TeamRow }) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-zinc-100 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-zinc-900">{row.email}</p>
        <p className="text-[10px] text-zinc-400">Member</p>
      </div>
      <dl className="grid grid-cols-4 gap-2 sm:shrink-0 sm:gap-3">
        <StatPill k="Won" v={String(row.deals_won)} />
        <StatPill k="Active" v={String(row.deals_active)} />
        <StatPill k="Revenue" v={formatUsd(row.revenue_won)} narrow />
        <StatPill k="Stale" v={String(row.stale_deals)} warn={row.stale_deals > 0} />
      </dl>
    </li>
  );
}

function StatPill({
  k,
  v,
  narrow,
  warn,
}: {
  k: string;
  v: string;
  narrow?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="text-center">
      <dt
        className={`text-[9px] font-medium uppercase tracking-wide ${
          warn ? "text-amber-700/90" : "text-zinc-400"
        }`}
      >
        {k}
      </dt>
      <dd
        className={`mt-0.5 text-[11px] font-semibold tabular-nums text-zinc-800 ${
          narrow ? "truncate" : ""
        }`}
        title={v}
      >
        {v}
      </dd>
    </div>
  );
}

export function ActivityRow({ item, dense }: { item: AnalyticsV1FeedItem; dense?: boolean }) {
  const label = feedLabel(item);
  const initials = label.replace(/[^A-Za-z]/g, "").slice(0, 1).toUpperCase() || "•";
  return (
    <div className={`flex gap-2.5 ${dense ? "px-2 py-1.5 sm:px-2.5" : "px-2.5 py-2 sm:px-3"}`}>
      <div
        className={`mt-0.5 flex shrink-0 items-center justify-center rounded-md text-[10px] font-semibold ring-1 ring-inset ${
          dense ? "h-6 w-6" : "h-7 w-7"
        } ${feedTone(item)}`}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-xs font-medium text-zinc-900">{label}</span>
          <time
            className="text-[10px] font-medium tabular-nums text-zinc-400"
            dateTime={item.created_at}
          >
            {formatShortTime(item.created_at)}
          </time>
        </div>
        <p className="truncate text-[10px] text-zinc-500">
          {item.deal_title ? (
            <span className="font-medium text-zinc-600">{item.deal_title}</span>
          ) : null}
          {item.deal_title && item.author_email ? " · " : null}
          {item.author_email ?? (item.author_id ? `User ${item.author_id}` : "")}
        </p>
        {item.content ? (
          <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-zinc-500">
            {item.content}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyBlock({
  title,
  body,
  className = "",
}: {
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-6 text-center ${className}`}
    >
      <p className="text-xs font-medium text-zinc-700">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-[11px] leading-relaxed text-zinc-500">{body}</p>
    </div>
  );
}

export function AnalyticsLoadingCard() {
  return (
    <div className="mb-4 rounded-xl border border-zinc-200/80 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col items-center justify-center gap-3 text-zinc-500">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-700"
          aria-hidden
        />
        <p className="text-sm font-medium text-zinc-600">Loading analytics…</p>
      </div>
    </div>
  );
}

export function AnalyticsErrorCard({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="mb-4 rounded-xl border border-red-200/90 bg-red-50/50 px-5 py-4 text-red-950">
      <p className="text-sm font-semibold tracking-tight">Analytics unavailable</p>
      <p className="mt-1.5 text-xs leading-relaxed text-red-900/85">{error}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-md bg-red-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-800"
      >
        Retry
      </button>
    </div>
  );
}
