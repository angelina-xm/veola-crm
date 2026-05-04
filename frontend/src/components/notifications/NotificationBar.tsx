"use client";

import type { NotificationItem } from "@/src/lib/api";

function iconFor(type: NotificationItem["type"]) {
  if (type === "overdue_task") return "🔴";
  if (type === "due_today") return "🟡";
  return "⚠️";
}

export default function NotificationBar({
  items,
  totalBadge,
  activeType,
  onSelect,
  onClear,
}: {
  items: NotificationItem[];
  totalBadge: number;
  activeType: NotificationItem["type"] | null;
  onSelect: (item: NotificationItem) => void;
  onClear: () => void;
}) {
  if (items.length === 0 || totalBadge === 0) return null;

  return (
    <div
      className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm"
      role="region"
      aria-label="Notifications"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <span className="text-base" aria-hidden>
          🔔
        </span>
        <span className="font-semibold">Notifications</span>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-800">
          {totalBadge}
        </span>
        {activeType ? (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100"
          >
            Clear filter
          </button>
        ) : null}
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map((n) => {
          const isActive = activeType === n.type;
          return (
            <li key={n.type}>
              <button
                type="button"
                onClick={() => onSelect(n)}
                className={`flex w-full cursor-pointer items-baseline gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-slate-200/80 ${
                  isActive ? "bg-blue-100 ring-1 ring-blue-300" : ""
                }`}
              >
                <span aria-hidden>{iconFor(n.type)}</span>
                <span className="text-slate-800">{n.message}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
