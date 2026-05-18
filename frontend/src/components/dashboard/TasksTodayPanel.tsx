"use client";

import Link from "next/link";
import { cn } from "@/src/lib/cn";
import { ROUTES } from "@/src/lib/product";
import {
  priorityBadgeClass,
  priorityLabel,
  taskDueChip,
  taskStatusBadgeClass,
  taskStatusLabel,
} from "@/src/lib/taskSemantics";
import type { CrmTask } from "@/src/types";

export default function TasksTodayPanel({
  tasks,
  loading,
  completedTodayCount = 0,
}: {
  tasks: CrmTask[];
  loading?: boolean;
  completedTodayCount?: number;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white shadow-[var(--vx-shadow-card)]">
      <div className="border-b border-zinc-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-zinc-900">My tasks</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Assigned to you · overdue and due today
          {completedTodayCount > 0
            ? ` · ${completedTodayCount} done today`
            : ""}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3 px-5 py-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-50" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M9 11l2 2 4-4M7 4h10a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="mt-3 text-sm font-medium text-zinc-800">Nothing due today</p>
          <p className="mt-1 text-xs text-zinc-500">
            You&apos;re clear on overdue and today&apos;s follow-ups.
          </p>
          <Link
            href={`${ROUTES.tasks}?create=1`}
            className="mt-4 inline-flex rounded-lg bg-[var(--vx-accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[var(--vx-accent-hover)]"
          >
            Add follow-up
          </Link>
        </div>
      ) : (
        <ul className="max-h-[22rem] space-y-0 overflow-y-auto px-3 py-2">
          {tasks.slice(0, 12).map((task) => {
            const due = taskDueChip(task);
            return (
              <li key={task.id}>
                <Link
                  href={ROUTES.tasks}
                  className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-zinc-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug text-zinc-800">
                      {task.content}
                    </span>
                    {task.deal_title || task.client_name ? (
                      <span className="mt-0.5 block truncate text-xs text-zinc-400">
                        {task.deal_title ?? task.client_name}
                      </span>
                    ) : null}
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium",
                          taskStatusBadgeClass(task)
                        )}
                      >
                        {taskStatusLabel(task)}
                      </span>
                      {due ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium",
                            due.className
                          )}
                        >
                          {due.label}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium",
                          priorityBadgeClass(task.priority)
                        )}
                      >
                        {priorityLabel(task.priority)}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-zinc-100 px-5 py-3">
        <Link
          href={ROUTES.tasks}
          className="text-xs font-medium text-[var(--vx-accent)] hover:text-[var(--vx-accent-hover)]"
        >
          View all tasks →
        </Link>
      </div>
    </section>
  );
}
