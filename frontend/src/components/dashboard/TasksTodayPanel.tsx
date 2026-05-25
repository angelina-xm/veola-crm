"use client";

import Link from "next/link";
import { cn } from "@/src/lib/cn";
import { ROUTES } from "@/src/lib/product";
import {
  priorityBadgeClass,
  priorityLabel,
  taskAssigneeLabel,
  taskDueChip,
  taskStatusBadgeClass,
  taskStatusLabel,
} from "@/src/lib/taskSemantics";
import type { CrmTask } from "@/src/types";
import { useTranslation } from "@/src/context/LocaleContext";

export default function TasksTodayPanel({
  tasks,
  loading,
  completedTodayCount = 0,
}: {
  tasks: CrmTask[];
  loading?: boolean;
  completedTodayCount?: number;
}) {
  const { t } = useTranslation();

  return (
    <section className="vx-card">
      <div className="vx-card-head">
        <div>
          <h2 className="text-[13px] font-semibold text-[var(--vx-text)]">
            {t("dashboardStats.myTasksTitle")}
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--vx-text-muted)]">
            {t("dashboardStats.tasksPanelHint")}
            {completedTodayCount > 0
              ? t("dashboardStats.doneTodaySuffix", { count: completedTodayCount })
              : ""}
          </p>
        </div>
        <Link
          href={ROUTES.tasks}
          className="text-xs font-medium text-[var(--vx-accent)] hover:text-[var(--vx-accent-hover)]"
        >
          {t("dashboardStats.allTasks")}
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2 px-3 py-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-[var(--vx-bg-subtle)]" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm font-medium text-[var(--vx-text)]">
            {t("dashboardStats.nothingDueToday")}
          </p>
          <p className="mt-1 text-xs text-[var(--vx-text-muted)]">
            {t("dashboardStats.tasksClear")}
          </p>
        </div>
      ) : (
        <ul className="max-h-[20rem] overflow-y-auto px-2 py-1">
          {tasks.slice(0, 10).map((task) => {
            const due = taskDueChip(task);
            const assignee = taskAssigneeLabel(task);
            return (
              <li key={task.id}>
                <Link
                  href={ROUTES.tasks}
                  className="flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--vx-bg-subtle)]"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[var(--vx-border)]",
                      task.is_completed && "border-[var(--vx-accent)] bg-[var(--vx-accent)] text-white"
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] leading-snug text-[var(--vx-text)]">
                      {task.content}
                    </span>
                    {(task.deal_title || task.client_name || assignee) && (
                      <span className="mt-0.5 block truncate text-[11px] text-[var(--vx-text-muted)]">
                        {[task.deal_title ?? task.client_name, assignee]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                    <span className="mt-1 flex flex-wrap gap-1">
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                          taskStatusBadgeClass(task)
                        )}
                      >
                        {taskStatusLabel(task)}
                      </span>
                      {due ? (
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                            due.className
                          )}
                        >
                          {due.label}
                        </span>
                      ) : null}
                      {!task.is_completed ? (
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                            priorityBadgeClass(task.priority)
                          )}
                        >
                          {priorityLabel(task.priority)}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
