"use client";

import Link from "next/link";
import { cn } from "@/src/lib/cn";
import { formatRelative } from "@/src/lib/formatRelative";
import { COPY, ROUTES } from "@/src/lib/product";
import type { AnalyticsV1FeedItem } from "@/src/types";

function feedTitle(item: AnalyticsV1FeedItem): string {
  if (item.deal_title) return item.deal_title;
  if (item.author_email) return item.author_email.split("@")[0] ?? "Team";
  return "Workspace";
}

function feedDescription(item: AnalyticsV1FeedItem): string {
  const text = item.content?.trim();
  if (text) return text;
  switch (item.kind) {
    case "deal_won":
      return "Deal won";
    case "deal_moved":
      return "Deal moved";
    case "task_completed":
      return "Task completed";
    case "task_open":
      return "Task created";
    case "note_added":
      return "Note added";
    default:
      return "Activity logged";
  }
}

function statusBadge(item: AnalyticsV1FeedItem): {
  label: string;
  className: string;
} {
  if (item.kind === "deal_won" || item.is_completed) {
    return {
      label: "completed",
      className: "bg-emerald-50 text-emerald-700",
    };
  }
  if (item.kind === "task_open") {
    return {
      label: "pending",
      className: "bg-amber-50 text-amber-800",
    };
  }
  return {
    label: "update",
    className: "bg-zinc-100 text-zinc-600",
  };
}

export default function RecentActivityFeed({
  items,
  loading,
}: {
  items: AnalyticsV1FeedItem[];
  loading?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white shadow-[var(--vx-shadow-card)]">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Recent activity</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Latest updates across deals and tasks
          </p>
        </div>
        <Link
          href={ROUTES.deals}
          className="text-xs font-medium text-[var(--vx-accent)] hover:text-[var(--vx-accent-hover)]"
        >
          {COPY.viewDeals}
        </Link>
      </div>
      {loading ? (
        <div className="space-y-0 divide-y divide-zinc-100 px-5 py-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg bg-zinc-50"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-zinc-500">
          No recent activity yet. Log a call or move a deal to see updates here.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {items.slice(0, 8).map((item) => {
            const badge = statusBadge(item);
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-zinc-50/80 sm:flex-nowrap"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-sm font-semibold text-zinc-900">
                      {feedTitle(item)}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {formatRelative(item.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-zinc-600">
                    {feedDescription(item)}
                  </p>
                </div>
                {item.deal_id ? (
                  <Link
                    href={ROUTES.deals}
                    className="hidden text-sm font-medium text-zinc-900 sm:block"
                  >
                    Open
                  </Link>
                ) : null}
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize",
                    badge.className
                  )}
                >
                  {badge.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
