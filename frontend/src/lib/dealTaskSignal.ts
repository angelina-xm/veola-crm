import { translate } from "@/src/i18n/translate";
import type { Activity } from "@/src/types";

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** <0 overdue, 0 today, >0 future (календарные дни, локаль). */
export function dueDateVsToday(dueIso: string, now: Date = new Date()): number {
  const due = new Date(dueIso);
  if (!Number.isFinite(due.getTime())) return 0;
  const a = startOfLocalDay(due);
  const b = startOfLocalDay(now);
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}

export type DealTaskSignalTone = "red" | "yellow" | "green" | "gray";

export type DealTaskSignal = {
  tone: DealTaskSignalTone;
  text: string;
  borderClass: string;
  textClass: string;
};

/**
 * Открытые задачи (type=task, is_completed=false) по одной сделке.
 */
export function getDealTaskSignal(
  openTasksForDeal: Activity[],
  now: Date = new Date()
): DealTaskSignal {
  const tasks = openTasksForDeal.filter(
    (t) => t.type === "task" && !t.is_completed
  );

  if (tasks.length === 0) {
    return {
      tone: "gray",
      text: translate("deals.noOpenTasks"),
      borderClass: "border-l-4 border-l-gray-200",
      textClass: "text-gray-500",
    };
  }

  let overdue = 0;
  let today = 0;
  let future = 0;
  let noDue = 0;

  for (const t of tasks) {
    if (!t.due_date || String(t.due_date).trim() === "") {
      noDue += 1;
      continue;
    }
    const cmp = dueDateVsToday(t.due_date, now);
    if (cmp < 0) overdue += 1;
    else if (cmp === 0) today += 1;
    else future += 1;
  }

  if (overdue > 0) {
    return {
      tone: "red",
      text: `⚠ ${translate("deals.overdueCount", { count: overdue })}`,
      borderClass: "border-l-4 border-l-red-500",
      textClass: "text-red-700",
    };
  }

  if (today > 0) {
    return {
      tone: "yellow",
      text: translate("deals.dueTodayCount", { count: today }),
      borderClass: "border-l-4 border-l-amber-400",
      textClass: "text-amber-800",
    };
  }

  if (future > 0 || noDue > 0) {
    const n = future + noDue;
    return {
      tone: "green",
      text:
        n === 1
          ? translate("deals.openTaskOne")
          : translate("deals.openTasksCount", { count: n }),
      borderClass: "border-l-4 border-l-emerald-500",
      textClass: "text-emerald-800",
    };
  }

  return {
    tone: "gray",
    text: translate("deals.noOpenTasks"),
    borderClass: "border-l-4 border-l-gray-200",
    textClass: "text-gray-500",
  };
}

export function groupOpenTasksByDealId(tasks: Activity[]): Map<string, Activity[]> {
  const m = new Map<string, Activity[]>();
  for (const t of tasks) {
    if (t.type !== "task" || t.is_completed) continue;
    const id = String(t.deal);
    const list = m.get(id) ?? [];
    list.push(t);
    m.set(id, list);
  }
  return m;
}
