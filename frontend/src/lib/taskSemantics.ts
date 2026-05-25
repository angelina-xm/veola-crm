import { translate } from "@/src/i18n/translate";
import type { AnalyticsFeedKind, AnalyticsV1FeedItem, CrmTask, TaskPriority } from "@/src/types";

/** Task lifecycle labels — not deal states, not CTAs. */
export type TaskStatusLabel = string;

export function taskStatusLabel(task: CrmTask): TaskStatusLabel {
  return task.is_completed
    ? translate("tasks.statusDone")
    : translate("tasks.statusTodo");
}

export function taskStatusBadgeClass(task: CrmTask): string {
  return task.is_completed ? "vx-badge-success" : "vx-badge-neutral";
}

export function taskAssigneeLabel(task: CrmTask): string | null {
  const email = task.assigned_to_email?.split("@")[0]?.trim();
  return email || null;
}

/** Due-window chip (overdue / due today) — separate from status. */
export function taskDueChip(
  task: CrmTask
): { label: string; className: string } | null {
  if (task.is_completed) return null;
  if (task.state === "overdue") {
    return { label: translate("tasks.overdue"), className: "vx-badge-danger" };
  }
  if (task.state === "today") {
    return { label: translate("tasks.dueToday"), className: "vx-badge-warning" };
  }
  return null;
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PRIORITY_CLASS: Record<TaskPriority, string> = {
  urgent: "vx-badge-danger",
  high: "vx-badge-danger",
  medium: "vx-badge-warning",
  low: "vx-badge-neutral",
};

const PRIORITY_KEYS: Record<TaskPriority, string> = {
  urgent: "tasks.priorityUrgent",
  high: "tasks.priorityHigh",
  medium: "tasks.priorityMedium",
  low: "tasks.priorityLow",
};

export function priorityBadgeClass(priority: TaskPriority): string {
  return PRIORITY_CLASS[priority] ?? PRIORITY_CLASS.medium;
}

export function priorityLabel(priority: TaskPriority): string {
  return translate(PRIORITY_KEYS[priority] ?? PRIORITY_KEYS.medium);
}

/** Sort operational queue: overdue → today → priority. */
export function sortOperationalTasks(tasks: CrmTask[]): CrmTask[] {
  const stateOrder = (t: CrmTask) => {
    if (t.state === "overdue") return 0;
    if (t.state === "today") return 1;
    return 2;
  };
  return [...tasks].sort((a, b) => {
    const sd = stateOrder(a) - stateOrder(b);
    if (sd !== 0) return sd;
    const pd =
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pd !== 0) return pd;
    const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    return da - db;
  });
}

export function mergeOperationalSnapshot(
  overdue: CrmTask[],
  today: CrmTask[]
): CrmTask[] {
  const seen = new Set<number>();
  const out: CrmTask[] = [];
  for (const t of [...overdue, ...today]) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    if (!t.is_completed) out.push(t);
  }
  return sortOperationalTasks(out);
}

/** Default due: today 17:00 local — so new tasks appear in operational views. */
export function defaultDueDatetimeLocal(): string {
  const d = new Date();
  d.setHours(17, 0, 0, 0);
  if (d.getTime() < Date.now()) {
    d.setDate(d.getDate() + 1);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Activity feed event type — not task/deal workflow state. */
export function activityFeedBadge(item: AnalyticsV1FeedItem): {
  label: string;
  className: string;
} {
  switch (item.kind as AnalyticsFeedKind) {
    case "deal_won":
      return { label: translate("activity.won"), className: "vx-badge-success" };
    case "deal_moved":
      return { label: translate("activity.moved"), className: "vx-badge-neutral" };
    case "task_completed":
      return { label: translate("activity.taskDone"), className: "vx-badge-success" };
    case "task_open":
      return { label: translate("activity.newTask"), className: "vx-badge-warning" };
    case "note_added":
      return { label: translate("activity.note"), className: "vx-badge-neutral" };
    default:
      return { label: translate("activity.activity"), className: "vx-badge-neutral" };
  }
}
