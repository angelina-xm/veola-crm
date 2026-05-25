"use client";

import { useMemo, useState } from "react";
import { translate } from "@/src/i18n/translate";
import { cn } from "@/src/lib/cn";
import { formatRelative } from "@/src/lib/formatRelative";
import type { ClientTimeline, TimelineEvent, TimelineFilter } from "@/src/types";
import { useTranslation } from "@/src/context/LocaleContext";

const FILTER_IDS: TimelineFilter[] = ["all", "deals", "calls", "notes"];

const FILTER_KEYS: Partial<Record<TimelineFilter, string>> = {
  all: "clients.filterAll",
  deals: "clients.filterDeals",
  calls: "clients.filterCalls",
  notes: "clients.filterNotes",
};

function iconForEvent(ev: TimelineEvent): string {
  if (ev.event_type === "deal_won") return "✦";
  if (ev.event_type.startsWith("deal_")) return "◆";
  if (ev.kind === "task") return "○";
  if (ev.event_type === "call") return "☎";
  if (ev.event_type === "meeting") return "◎";
  if (ev.event_type === "note") return "✎";
  return "·";
}

function cardStyles(importance: TimelineEvent["importance"]): string {
  if (importance === "milestone") {
    return "border-l-4 border-l-emerald-500 bg-emerald-50/50";
  }
  if (importance === "highlight") {
    return "border-l-4 border-l-amber-400 bg-amber-50/40";
  }
  return "border-l-4 border-l-zinc-200 bg-white";
}

function monthGroupKey(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return translate("clients.timelineUnknown");
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

type Props = {
  timeline: ClientTimeline | null;
  loading?: boolean;
  error?: string | null;
  onFilterChange?: (filter: TimelineFilter) => void;
  activeFilter?: TimelineFilter;
  noteForm?: React.ReactNode;
};

export default function CustomerTimeline({
  timeline,
  loading,
  error,
  onFilterChange,
  activeFilter = "all",
  noteForm,
}: Props) {
  const { t } = useTranslation();
  const filters = useMemo(
    () =>
      FILTER_IDS.map((id) => ({
        id,
        label: t(FILTER_KEYS[id] ?? "clients.filterAll"),
      })),
    [t]
  );
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

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white shadow-[var(--vx-shadow-card)]">
      <div className="border-b border-zinc-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-zinc-900">{t("clients.timelineTitle")}</h2>
        <p className="mt-0.5 text-xs text-zinc-500">{t("clients.timelineHint")}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                filter === f.id
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 px-5 py-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-50" />
          ))}
        </div>
      ) : error ? (
        <p className="px-5 py-8 text-sm text-amber-800">{error}</p>
      ) : events.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-zinc-500">
          {t("clients.timelineEmptyFiltered")}
        </p>
      ) : (
        <div className="max-h-[32rem] space-y-6 overflow-y-auto px-5 py-5">
          {grouped.map(([month, list]) => (
            <div key={month}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {month}
              </p>
              <ul className="space-y-2">
                {list.map((ev) => (
                  <li
                    key={ev.id}
                    className={cn(
                      "rounded-xl border border-zinc-100 px-4 py-3 shadow-sm",
                      cardStyles(ev.importance)
                    )}
                  >
                    <div className="flex gap-3">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-600"
                        aria-hidden
                      >
                        {iconForEvent(ev)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold text-zinc-900">
                            {ev.title}
                          </p>
                          <time className="text-xs text-zinc-400">
                            {formatRelative(ev.occurred_at)}
                          </time>
                        </div>
                        {ev.subtitle ? (
                          <p className="mt-0.5 text-xs text-zinc-500">{ev.subtitle}</p>
                        ) : null}
                        {ev.body ? (
                          <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                            {ev.body}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {noteForm ? (
        <div className="border-t border-zinc-100 px-5 py-4">{noteForm}</div>
      ) : null}
    </section>
  );
}

