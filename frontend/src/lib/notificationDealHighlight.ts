import type { NotificationItemType } from "@/src/lib/api";
import type { Activity } from "@/src/types";

function dealHasOverdueOpenTask(tasks: Activity[], now: Date): boolean {
  for (const t of tasks) {
    if (t.type !== "task" || t.is_completed || !t.due_date) continue;
    const due = new Date(t.due_date);
    if (Number.isFinite(due.getTime()) && due.getTime() < now.getTime()) {
      return true;
    }
  }
  return false;
}

/** Как на backend: календарный «сегодня», срок ещё не прошёл по времени. */
function dealHasDueTodayOpenTask(tasks: Activity[], now: Date): boolean {
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (const t of tasks) {
    if (t.type !== "task" || t.is_completed || !t.due_date) continue;
    const due = new Date(t.due_date);
    if (!Number.isFinite(due.getTime())) continue;
    if (due.getTime() < now.getTime()) continue;
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    if (dueDay.getTime() === startToday.getTime()) return true;
  }
  return false;
}

/**
 * ID сделок на доске, которые попадают под выбранное уведомление.
 */
export function computeHighlightedDealIds(
  filterType: NotificationItemType,
  openTasksByDealId: Record<string, Activity[]>,
  staleDealIds: readonly string[]
): Set<string> {
  const ids = new Set<string>();
  const now = new Date();

  if (filterType === "stale_deals") {
    staleDealIds.forEach((id) => ids.add(String(id)));
    return ids;
  }

  for (const [dealId, tasks] of Object.entries(openTasksByDealId)) {
    if (filterType === "overdue_task" && dealHasOverdueOpenTask(tasks, now)) {
      ids.add(dealId);
    }
    if (filterType === "due_today" && dealHasDueTodayOpenTask(tasks, now)) {
      ids.add(dealId);
    }
  }

  return ids;
}
