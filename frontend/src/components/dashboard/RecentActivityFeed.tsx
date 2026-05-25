"use client";

import Link from "next/link";
import { cn } from "@/src/lib/cn";
import { formatRelative } from "@/src/lib/formatRelative";
import { ROUTES } from "@/src/lib/product";
import { useTranslation } from "@/src/context/LocaleContext";
import { translate } from "@/src/i18n/translate";
import { activityFeedBadge } from "@/src/lib/taskSemantics";
import type { AnalyticsV1FeedItem } from "@/src/types";

function feedTitle(item: AnalyticsV1FeedItem): string {
  if (item.deal_title) return item.deal_title;
  if (item.author_email)
    return item.author_email.split("@")[0] ?? translate("activity.team");
  return translate("activity.workspace");
}

function feedDescription(item: AnalyticsV1FeedItem): string {
  const text = item.content?.trim();
  if (text) return text;
  switch (item.kind) {
    case "deal_won":
      return translate("activity.dealWon");
    case "deal_moved":
      return translate("activity.dealMoved");
    case "task_completed":
      return translate("activity.taskCompleted");
    case "task_open":
      return translate("activity.taskCreated");
    case "note_added":
      return translate("activity.noteAdded");
    default:
      return translate("activity.activityLogged");
  }
}

const AVATAR_TONES = [
  "bg-[var(--vx-accent-muted)] text-[var(--vx-accent)]",
  "vx-badge-success",
  "vx-badge-warning",
  "vx-badge-neutral",
];

function avatarTone(id: number) {
  return AVATAR_TONES[id % AVATAR_TONES.length];
}

export default function RecentActivityFeed({
  items,
  loading,
}: {
  items: AnalyticsV1FeedItem[];
  loading?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <section className="vx-card">
      <div className="vx-card-head">
        <div>
          <h2 className="text-[13px] font-semibold text-[var(--vx-text)]">
            {t("dashboard.recentActivity")}
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--vx-text-muted)]">
            {t("dashboard.recentActivityHint")}
          </p>
        </div>
        <Link
          href={ROUTES.deals}
          className="text-xs font-medium text-[var(--vx-accent)] hover:text-[var(--vx-accent-hover)]"
        >
          {t("copy.viewDeals")}
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2 px-4 py-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg bg-[var(--vx-bg-subtle)]"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-[var(--vx-text-muted)]">
          No recent activity yet. Log a call or move a deal to see updates here.
        </p>
      ) : (
        <ul>
          {items.slice(0, 8).map((item) => {
            const badge = activityFeedBadge(item);
            const initial = feedTitle(item).charAt(0).toUpperCase();
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 border-t border-[var(--vx-border-subtle)] px-4 py-2.5 transition-colors first:border-t-0 hover:bg-[var(--vx-bg-subtle)]"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                    avatarTone(item.id)
                  )}
                >
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold text-[var(--vx-text)]">
                      {feedTitle(item)}
                    </span>
                    <span className="shrink-0 text-[11px] text-[var(--vx-text-muted)]">
                      {formatRelative(item.created_at)}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-[var(--vx-text-secondary)]">
                    {feedDescription(item)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold capitalize",
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
