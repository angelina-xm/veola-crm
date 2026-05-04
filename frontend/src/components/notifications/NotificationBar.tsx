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
}: {
  items: NotificationItem[];
  totalBadge: number;
}) {
  if (items.length === 0 || totalBadge === 0) return null;

  return (
    <div
      className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <span className="text-base" aria-hidden>
          🔔
        </span>
        <span className="font-semibold">Notifications</span>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-800">
          {totalBadge}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map((n) => (
          <li
            key={n.type}
            className="flex items-baseline gap-2 text-slate-800"
          >
            <span aria-hidden>{iconFor(n.type)}</span>
            <span>{n.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
