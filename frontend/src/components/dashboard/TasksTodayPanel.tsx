"use client";

import Link from "next/link";
import { cn } from "@/src/lib/cn";
import type { CrmTask, TaskPriority } from "@/src/types";

const priorityStyles: Record<TaskPriority, string> = {
  urgent: "bg-rose-50 text-rose-700",
  high: "bg-rose-50/80 text-rose-600",
  medium: "bg-blue-50 text-blue-700",
  low: "bg-zinc-100 text-zinc-600",
};

export default function TasksTodayPanel({
  tasks,
  loading,
}: {
  tasks: CrmTask[];
  loading?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white shadow-[var(--vx-shadow-card)]">
      <div className="border-b border-zinc-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-zinc-900">Tasks today</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Your operational follow-ups</p>
      </div>
      {loading ? (
        <div className="space-y-3 px-5 py-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-zinc-50" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-zinc-500">
          No tasks due today.{" "}
          <Link href="/tasks" className="font-medium text-[var(--vx-accent)]">
            Open tasks
          </Link>
        </p>
      ) : (
        <ul className="max-h-[22rem] space-y-0 overflow-y-auto px-3 py-2">
          {tasks.slice(0, 10).map((task) => (
            <li key={task.id}>
              <Link
                href="/tasks"
                className={cn(
                  "flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-zinc-50",
                  task.is_completed && "opacity-60"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    task.is_completed
                      ? "border-emerald-400 bg-emerald-50 text-emerald-600"
                      : "border-zinc-300 bg-white"
                  )}
                  aria-hidden
                >
                  {task.is_completed ? (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm leading-snug",
                      task.is_completed
                        ? "text-zinc-400 line-through"
                        : "text-zinc-800"
                    )}
                  >
                    {task.content}
                  </span>
                  {task.deal_title || task.client_name ? (
                    <span className="mt-0.5 block truncate text-xs text-zinc-400">
                      {task.deal_title ?? task.client_name}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                    priorityStyles[task.priority] ?? priorityStyles.medium
                  )}
                >
                  {task.priority}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-zinc-100 px-5 py-3">
        <Link
          href="/tasks"
          className="text-xs font-medium text-[var(--vx-accent)] hover:text-[var(--vx-accent-hover)]"
        >
          View all tasks →
        </Link>
      </div>
    </section>
  );
}
