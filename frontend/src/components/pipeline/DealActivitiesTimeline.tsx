"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createActivity, getActivities, patchActivity } from "@/src/lib/api";
import { Activity, ActivityType } from "@/src/types";

const TYPE_LABELS: Record<ActivityType, string> = {
  note: "Note",
  call: "Call",
  meeting: "Meeting",
  task: "Task",
};

const TYPE_STYLES: Record<ActivityType, string> = {
  note: "border-gray-200 bg-gray-50 text-gray-800",
  call: "border-blue-200 bg-blue-50 text-blue-900",
  meeting: "border-violet-200 bg-violet-50 text-violet-900",
  task: "border-amber-200 bg-amber-50 text-amber-900",
};

type ActivityFilter = "all" | "tasks" | "overdue";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function isOverdue(a: Activity, now: number) {
  if (a.type !== "task" || a.is_completed) return false;
  if (!a.due_date) return false;
  const t = new Date(a.due_date).getTime();
  return Number.isFinite(t) && t < now;
}

function byCreatedDesc(a: Activity, b: Activity) {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function applyViewFilter(list: Activity[], f: ActivityFilter, now: number) {
  if (f === "tasks") return list.filter((x) => x.type === "task");
  if (f === "overdue")
    return list.filter((x) => isOverdue(x, now));
  return list;
}

function sortForDisplay(list: Activity[]) {
  const tasks = list.filter((x) => x.type === "task");
  const rest = list.filter((x) => x.type !== "task");
  const open = tasks.filter((t) => !t.is_completed).sort(byCreatedDesc);
  const done = tasks.filter((t) => t.is_completed).sort(byCreatedDesc);
  const other = rest.sort(byCreatedDesc);
  return { taskRows: [...open, ...done], otherRows: other };
}

function ActivityRow({
  a,
  disabled,
  patchingId,
  onToggleTask,
}: {
  a: Activity;
  disabled: boolean;
  patchingId: string | null;
  onToggleTask: (a: Activity, completed: boolean) => void;
}) {
  const now = Date.now();
  const overdue = isOverdue(a, now);
  const completed = a.type === "task" && a.is_completed;
  const isTemp = String(a.id).startsWith("temp-");
  const busy = patchingId === String(a.id);

  return (
    <li
      className={`rounded-lg border px-3 py-2 text-sm ${TYPE_STYLES[a.type] ?? TYPE_STYLES.note} ${
        completed ? "opacity-80" : ""
      }`}
    >
      <div className="flex flex-wrap items-start gap-2">
        {a.type === "task" ? (
          <input
            type="checkbox"
            className="mt-0.5 shrink-0"
            checked={Boolean(a.is_completed)}
            disabled={disabled || isTemp || busy}
            onChange={(e) => {
              onToggleTask(a, e.target.checked);
            }}
            aria-label="Task done"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-medium ${completed ? "text-gray-500 line-through" : ""}`}
            >
              {TYPE_LABELS[a.type]}
            </span>
            <span className="text-xs opacity-75">
              {formatWhen(a.created_at)}
            </span>
            {overdue ? (
              <span className="text-xs font-medium text-red-600">Overdue</span>
            ) : null}
          </div>
          {a.author_email ? (
            <p className="mt-1 text-xs opacity-80">{a.author_email}</p>
          ) : null}
          {a.content ? (
            <p
              className={`mt-1 whitespace-pre-wrap ${
                completed ? "text-gray-500 line-through" : ""
              }`}
            >
              {a.content}
            </p>
          ) : null}
          {a.due_date ? (
            <p className={`mt-1 text-xs ${overdue ? "font-medium text-red-700" : ""}`}>
              Due: {formatWhen(a.due_date)}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function DealActivitiesTimeline({
  companyId,
  dealId,
  disabled,
}: {
  companyId: number;
  dealId: string | number;
  disabled: boolean;
}) {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<ActivityType>("note");
  const [content, setContent] = useState("");
  const [dueLocal, setDueLocal] = useState("");
  const [viewFilter, setViewFilter] = useState<ActivityFilter>("all");
  const [patchingId, setPatchingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getActivities(companyId, dealId);
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, dealId]);

  useEffect(() => {
    void load();
  }, [load]);

  const { taskRows, otherRows } = useMemo(() => {
    const t = Date.now();
    const filtered = applyViewFilter(items, viewFilter, t);
    return sortForDisplay(filtered);
  }, [items, viewFilter]);

  const handleToggleTask = useCallback(
    async (a: Activity, completed: boolean) => {
      if (disabled || String(a.id).startsWith("temp-")) return;
      const id = String(a.id);
      const prev = items;
      setPatchingId(id);
      setItems((list) =>
        list.map((x) =>
          String(x.id) === id ? { ...x, is_completed: completed } : x
        )
      );
      try {
        const updated = await patchActivity(companyId, a.id, {
          is_completed: completed,
        });
        setItems((list) =>
          list.map((x) => (String(x.id) === id ? updated : x))
        );
      } catch (err) {
        setItems(prev);
        window.alert(
          err instanceof Error ? err.message : "Failed to update task"
        );
      } finally {
        setPatchingId(null);
      }
    },
    [companyId, disabled, items]
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || saving) return;

    const dealNum = Number(dealId);
    if (!Number.isFinite(dealNum)) return;

    let dueIso: string | null = null;
    if (dueLocal.trim()) {
      const d = new Date(dueLocal);
      if (Number.isFinite(d.getTime())) {
        dueIso = d.toISOString();
      }
    }

    const tempId = `temp-${Date.now()}`;
    const optimistic: Activity = {
      id: tempId,
      deal: dealNum,
      author: 0,
      author_email: "…",
      type,
      content: content.trim() || undefined,
      due_date: dueIso,
      is_completed: false,
      created_at: new Date().toISOString(),
    };

    setItems((prev) => [optimistic, ...prev]);
    setSaving(true);

    try {
      const created = await createActivity(companyId, {
        deal: dealNum,
        type,
        content: content.trim() || undefined,
        due_date: dueIso,
      });
      setItems((prev) =>
        prev.map((a) => (String(a.id) === tempId ? created : a))
      );
      setContent("");
      setDueLocal("");
      setType("note");
    } catch (err) {
      setItems((prev) => prev.filter((a) => String(a.id) !== tempId));
      window.alert(
        err instanceof Error ? err.message : "Failed to add activity"
      );
    } finally {
      setSaving(false);
    }
  };

  const filterBtn = (key: ActivityFilter, label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setViewFilter(key)}
      disabled={disabled || saving}
      className={`rounded border px-2 py-1 text-xs ${
        viewFilter === key
          ? "border-gray-800 bg-gray-800 text-white"
          : "border-gray-300 bg-white text-gray-700"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      id="deal-activities-section"
      className="mt-6 border-t border-gray-200 pt-4"
    >
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Activity</h3>

      <div className="mb-3 flex flex-wrap gap-2">
        {filterBtn("all", "All")}
        {filterBtn("tasks", "Tasks")}
        {filterBtn("overdue", "Overdue")}
      </div>

      {loading ? (
        <p className="mb-4 text-sm text-gray-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="mb-4 text-sm text-gray-500">No activity yet.</p>
      ) : taskRows.length === 0 && otherRows.length === 0 ? (
        <p className="mb-4 text-sm text-gray-500">Nothing matches this filter.</p>
      ) : (
        <div className="mb-4 max-h-64 space-y-4 overflow-y-auto pr-1">
          {taskRows.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                Tasks
              </p>
              <ul className="space-y-2">
                {taskRows.map((a) => (
                  <ActivityRow
                    key={String(a.id)}
                    a={a}
                    disabled={disabled}
                    patchingId={patchingId}
                    onToggleTask={handleToggleTask}
                  />
                ))}
              </ul>
            </div>
          ) : null}
          {otherRows.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                Other
              </p>
              <ul className="space-y-2">
                {otherRows.map((a) => (
                  <ActivityRow
                    key={String(a.id)}
                    a={a}
                    disabled={disabled}
                    patchingId={patchingId}
                    onToggleTask={handleToggleTask}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      <form onSubmit={(e) => void handleAdd(e)} className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ActivityType)}
            disabled={disabled || saving}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {(Object.keys(TYPE_LABELS) as ActivityType[]).map((k) => (
              <option key={k} value={k}>
                {TYPE_LABELS[k]}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={dueLocal}
            onChange={(e) => setDueLocal(e.target.value)}
            disabled={disabled || saving}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Details…"
          rows={3}
          disabled={disabled || saving}
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={disabled || saving}
          className="rounded bg-gray-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {saving ? "Loading..." : "Add activity"}
        </button>
      </form>
    </div>
  );
}
