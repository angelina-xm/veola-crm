"use client";

import { useMemo, useState } from "react";
import type { ClientTimeline, TimelineEvent, TimelineFilter } from "@/src/types";

const FILTERS: { id: TimelineFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "deals", label: "Deals" },
  { id: "activities", label: "Activities" },
  { id: "tasks", label: "Tasks" },
];

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function monthGroupKey(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "Unknown";
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function iconForEvent(ev: TimelineEvent): string {
  if (ev.event_type === "deal_won") return "✦";
  if (ev.event_type.startsWith("deal_")) return "◆";
  if (ev.kind === "task") return "○";
  if (ev.event_type === "call") return "☎";
  if (ev.event_type === "meeting") return "◎";
  return "—";
}

function cardStyles(importance: TimelineEvent["importance"]): string {
  if (importance === "milestone") {
    return "border-l-4 border-l-emerald-500 bg-emerald-50/60 shadow-sm";
  }
  if (importance === "highlight") {
    return "border-l-4 border-l-amber-400 bg-amber-50/40";
  }
  return "border-l-4 border-l-slate-200 bg-white";
}

type Props = {
  timeline: ClientTimeline | null;
  loading?: boolean;
  error?: string | null;
  onFilterChange?: (filter: TimelineFilter) => void;
  activeFilter?: TimelineFilter;
};

export default function CustomerTimeline({
  timeline,
  loading,
  error,
  onFilterChange,
  activeFilter = "all",
}: Props) {
  const [localFilter, setLocalFilter] = useState<TimelineFilter>(activeFilter);
  const filter = onFilterChange ? activeFilter : localFilter;

  const setFilter = (f: TimelineFilter) => {
    if (onFilterChange) onFilterChange(f);
    else setLocalFilter(f);
  };

  const events = timeline?.events ?? [];

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const ev of events) {
      const key = monthGroupKey(ev.occurred_at);
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [events]);

  const summary = timeline?.summary;

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Relationship timeline</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            A calm history of deals, conversations, and follow-ups
          </p>
        </div>
        {summary ? (
          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
            <span>{summary.total_deals} deals</span>
            <span>{summary.won_deals} won</span>
            {summary.total_won_revenue > 0 ? (
              <span>
                ${summary.total_won_revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
                won
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              filter === f.id
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading timeline…</p>
      ) : null}
      {error ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      {!loading && !error && events.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          No history yet — notes, calls, and deals will appear here as your relationship grows.
        </p>
      ) : null}

      {!loading && !error && events.length > 0 ? (
        <div className="space-y-8">
          {grouped.map(([month, monthEvents]) => (
            <div key={month}>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                {month}
              </p>
              <ul className="relative space-y-3 pl-4 before:absolute before:left-[7px] before:top-2 before:h-[calc(100%-8px)] before:w-px before:bg-slate-200">
                {monthEvents.map((ev) => (
                  <li key={ev.id} className="relative">
                    <span
                      className={`absolute -left-4 top-3 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] ${
                        ev.importance === "milestone"
                          ? "bg-emerald-500 text-white"
                          : "bg-white ring-2 ring-slate-200 text-slate-400"
                      }`}
                      aria-hidden
                    >
                      {ev.importance === "milestone" ? "" : ""}
                    </span>
                    <article
                      className={`rounded-lg border border-slate-100 px-4 py-3 ${cardStyles(ev.importance)}`}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">
                          <span className="mr-1.5 text-slate-400" aria-hidden>
                            {iconForEvent(ev)}
                          </span>
                          {ev.title}
                        </p>
                        <time className="text-xs text-slate-500" dateTime={ev.occurred_at}>
                          {formatWhen(ev.occurred_at)}
                        </time>
                      </div>
                      {ev.subtitle ? (
                        <p className="mt-0.5 text-xs text-slate-600">{ev.subtitle}</p>
                      ) : null}
                      {ev.body ? (
                        <p className="mt-2 text-sm leading-relaxed text-slate-700">{ev.body}</p>
                      ) : null}
                      {ev.deal_title && ev.kind !== "deal" ? (
                        <p className="mt-2 text-xs text-slate-500">Deal: {ev.deal_title}</p>
                      ) : null}
                    </article>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
