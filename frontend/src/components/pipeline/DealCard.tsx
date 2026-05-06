"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import {
  clientNameById,
  formatCreatedRelative,
  formatDealAmountUsd,
  formatDealIdLabel,
} from "@/src/lib/dealDisplay";
import {
  dueDateVsToday,
  getDealTaskSignal,
  type DealTaskSignal,
} from "@/src/lib/dealTaskSignal";
import type { TaskPreset } from "@/src/lib/quickTask";
import { DAY_MS, scaleMs } from "@/src/lib/timeConfig";
import { Activity, Client, Deal } from "@/src/types";
import DealQuickTaskMenu from "./DealQuickTaskMenu";

export type StageFallbackPreset = "new" | "negotiation" | "won";
export type SuggestedAction = "Call client" | "Send proposal" | "Follow up";
export type DealHealth = "urgent" | "at_risk" | "cold";

const HEALTH_STALE_MS =
  scaleMs(
    process.env.NEXT_PUBLIC_DEV_FAST === "true" ? 60 * 1000 : 48 * 60 * 60 * 1000
  );
const FOLLOW_UP_SUGGEST_MS = scaleMs(2 * DAY_MS);

export function getDealHealth(deal: Deal, activities: Activity[] = []): DealHealth {
  const hasOverdueTasks = activities.some((a) => {
    if (a.type !== "task" || a.is_completed || !a.due_date) return false;
    const dueTs = new Date(a.due_date).getTime();
    return Number.isFinite(dueTs) && dueTs < Date.now();
  });
  if (hasOverdueTasks) return "urgent";

  const lastActivityTs = activities.reduce((maxTs, item) => {
    const ts = new Date(item.created_at).getTime();
    if (!Number.isFinite(ts)) return maxTs;
    return Math.max(maxTs, ts);
  }, Number.isFinite(new Date(deal.created_at ?? "").getTime())
    ? new Date(deal.created_at as string).getTime()
    : 0);

  if (lastActivityTs > 0 && Date.now() - lastActivityTs > HEALTH_STALE_MS) {
    return "at_risk";
  }
  return "cold";
}

export function getSuggestedActions(
  deal: Deal,
  stageName: string | null | undefined,
  activities: Activity[]
): SuggestedAction[] {
  const out: SuggestedAction[] = [];
  const stage = String(stageName ?? "").trim().toLowerCase();
  if (stage === "new") out.push("Call client");
  if (stage === "negotiation") out.push("Send proposal");

  const lastActivityTs = activities.reduce((maxTs, item) => {
    const ts = new Date(item.created_at).getTime();
    if (!Number.isFinite(ts)) return maxTs;
    return Math.max(maxTs, ts);
  }, Number.isFinite(new Date(deal.created_at ?? "").getTime())
    ? new Date(deal.created_at as string).getTime()
    : 0);
  const staleForMs = Date.now() - lastActivityTs;
  if (staleForMs > FOLLOW_UP_SUGGEST_MS) {
    out.push("Follow up");
  }

  const existingOpenTaskContent = new Set(
    activities
      .filter((a) => a.type === "task" && !a.is_completed)
      .map((a) => String(a.content ?? "").trim().toLowerCase())
  );
  return out.filter(
    (label) => !existingOpenTaskContent.has(label.trim().toLowerCase())
  );
}

export function DealCardContent({
  deal,
  clients = [],
  openTasksForDeal = [],
  taskSignal: taskSignalProp,
}: {
  deal: Deal;
  clients?: Client[];
  openTasksForDeal?: Activity[];
  taskSignal?: DealTaskSignal;
}) {
  const formattedAmount = formatDealAmountUsd(deal.amount);
  const clientLabel = clientNameById(clients, deal.client);
  const clientLine =
    clientLabel ??
    (deal.client != null && deal.client !== ""
      ? String(deal.client)
      : "—");
  const taskSignal = taskSignalProp ?? getDealTaskSignal(openTasksForDeal);

  return (
    <>
      <p className="text-sm font-semibold text-gray-900">
        {deal.title}{" "}
        <span className="font-normal text-gray-500">
          ({formatDealIdLabel(deal.id)})
        </span>
      </p>
      <p className="mt-1 text-xs text-gray-600">
        Client: {clientLine}
      </p>
      {formattedAmount ? (
        <p className="mt-0.5 text-sm font-medium text-gray-900">
          {formattedAmount}
        </p>
      ) : null}
      <p className={`mt-1 text-xs font-medium ${taskSignal.textClass}`}>
        {taskSignal.text}
      </p>
      {deal.created_at ? (
        <p className="mt-1 text-xs text-gray-500">
          Created: {formatCreatedRelative(deal.created_at)}
        </p>
      ) : null}
    </>
  );
}

export default function DealCard({
  deal,
  index,
  stageId,
  isDeleting = false,
  deleteDisabled = false,
  dragDisabled = false,
  clients = [],
  onOpen,
  onDelete,
  openTasksForDeal = [],
  spotlight = false,
  dimmed = false,
  onQuickCompleteFirstTask,
  quickCompleting = false,
  onQuickAddTask,
  quickAddingTask = false,
  onInlineSave,
  inlineSaving = false,
  onMoveToFallbackStage,
  movingStage = false,
  stageName,
  onSuggestedAction,
  suggestedActionLoading = false,
  needsAttention = false,
  onTaskComplete,
  completingTaskId = null,
  notes = [],
  onAddNote,
  addingNote = false,
}: {
  deal: Deal;
  index: number;
  stageId: string;
  clients?: Client[];
  openTasksForDeal?: Activity[];
  spotlight?: boolean;
  dimmed?: boolean;
  onQuickCompleteFirstTask?: () => void | Promise<void>;
  quickCompleting?: boolean;
  onQuickAddTask?: (
    preset: TaskPreset,
    customContent?: string
  ) => void | Promise<void>;
  quickAddingTask?: boolean;
  onInlineSave?: (patch: { title?: string; amount?: number }) => void | Promise<void>;
  inlineSaving?: boolean;
  onMoveToFallbackStage?: (preset: StageFallbackPreset) => void | Promise<void>;
  movingStage?: boolean;
  stageName?: string;
  onSuggestedAction?: (label: SuggestedAction) => void | Promise<void>;
  suggestedActionLoading?: boolean;
  needsAttention?: boolean;
  onTaskComplete?: (taskId: string) => void | Promise<void>;
  completingTaskId?: string | null;
  notes?: Activity[];
  onAddNote?: () => void | Promise<void>;
  addingNote?: boolean;
  isDeleting?: boolean;
  deleteDisabled?: boolean;
  dragDisabled?: boolean;
  onOpen: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
}) {
  const taskSignal = getDealTaskSignal(openTasksForDeal);
  const hasOpenTask = openTasksForDeal.some(
    (t) => t.type === "task" && !t.is_completed
  );
  const dealHealth = getDealHealth(deal, openTasksForDeal);
  const suggestedActions = getSuggestedActions(deal, stageName, openTasksForDeal);
  const [titleEdit, setTitleEdit] = useState(false);
  const [amountEdit, setAmountEdit] = useState(false);
  const [titleDraft, setTitleDraft] = useState(deal.title);
  const [amountDraft, setAmountDraft] = useState(
    deal.amount != null ? String(deal.amount) : ""
  );
  const [completedLocalIds, setCompletedLocalIds] = useState<Set<string>>(
    () => new Set()
  );
  useEffect(() => {
    if (!titleEdit) {
      setTitleDraft(deal.title);
    }
  }, [deal.title, titleEdit]);
  useEffect(() => {
    if (!amountEdit) {
      setAmountDraft(deal.amount != null ? String(deal.amount) : "");
    }
  }, [deal.amount, amountEdit]);
  const topTasks = [...openTasksForDeal]
    .filter((t) => t.type === "task")
    .sort((a, b) => {
      const aDue = a.due_date ? dueDateVsToday(a.due_date) : Number.POSITIVE_INFINITY;
      const bDue = b.due_date ? dueDateVsToday(b.due_date) : Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    })
    .slice(0, 3);
  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const lastActivity = sortedNotes[0] ?? null;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: `deal-${String(deal.id)}`,
    disabled: dragDisabled,
    data: {
      stageId,
      index,
      dealId: String(deal.id),
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const focusRing =
    spotlight && !dimmed
      ? "ring-2 ring-blue-500 ring-offset-1 bg-blue-50/60"
      : "";
  const attentionClass = needsAttention
    ? "border border-amber-500 bg-amber-50 shadow-[0_0_0_1px_rgba(245,158,11,0.45)] dark:border-amber-400/70 dark:bg-amber-950/20"
    : "";
  const urgentClass =
    dealHealth === "urgent"
      ? "border border-red-400 bg-red-50 shadow-[0_0_0_1px_rgba(248,113,113,0.35)]"
      : "";
  const dimClass = dimmed ? "opacity-40" : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mb-3 flex gap-1 overflow-hidden rounded-lg bg-white shadow-md transition-all duration-300 hover:-translate-y-[1px] hover:shadow-lg ${taskSignal.borderClass} ${focusRing} ${attentionClass} ${urgentClass} ${dimClass}`}
      {...attributes}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab touch-none border-r border-gray-100 px-2 py-3 text-gray-400 hover:bg-gray-50 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
        {...listeners}
        disabled={dragDisabled}
        aria-label="Перетащить"
      >
        ⋮⋮
      </button>
      <div className="min-w-0 flex-1 py-3 pr-3">
        <div className="w-full text-left">
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    dealHealth === "urgent"
                      ? "bg-red-100 text-red-800"
                      : dealHealth === "at_risk"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {dealHealth === "urgent"
                    ? "🔥 Urgent"
                    : dealHealth === "at_risk"
                      ? "⚠️ At risk"
                      : "🧊 Cold"}
                </span>
              </div>
              {titleEdit ? (
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  className="w-full rounded border border-blue-300 px-1.5 py-1 text-sm font-semibold text-gray-900"
                  disabled={inlineSaving || deleteDisabled}
                  onBlur={() => {
                    setTitleEdit(false);
                    const next = titleDraft.trim();
                    if (!next || next === deal.title || !onInlineSave) {
                      setTitleDraft(deal.title);
                      return;
                    }
                    void onInlineSave({ title: next });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                    if (e.key === "Escape") {
                      setTitleDraft(deal.title);
                      setTitleEdit(false);
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="cursor-pointer rounded px-1.5 py-0.5 text-left text-base font-bold text-gray-900 hover:bg-gray-100"
                  onClick={() => setTitleEdit(true)}
                  disabled={inlineSaving || deleteDisabled}
                  title="Click to edit title"
                >
                  {deal.title}{" "}
                  <span className="font-normal text-gray-500">
                    ({formatDealIdLabel(deal.id)})
                  </span>
                </button>
              )}
            </div>
            <button
              type="button"
              className="text-xs text-gray-500 hover:underline"
              onClick={() => onOpen(deal)}
            >
              Details
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-700">
            Client: {clientNameById(clients, deal.client) ?? (deal.client ? String(deal.client) : "—")}
          </p>
          {amountEdit ? (
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={amountDraft}
              onChange={(e) => setAmountDraft(e.target.value)}
              className="mt-1 w-full rounded border border-blue-300 px-1.5 py-1 text-sm font-medium text-gray-900"
              disabled={inlineSaving || deleteDisabled}
              onBlur={() => {
                setAmountEdit(false);
                if (!onInlineSave) {
                  setAmountDraft(deal.amount != null ? String(deal.amount) : "");
                  return;
                }
                const parsed = Number.parseFloat(amountDraft.replace(",", "."));
                if (!Number.isFinite(parsed) || parsed === Number(deal.amount ?? 0)) {
                  setAmountDraft(deal.amount != null ? String(deal.amount) : "");
                  return;
                }
                void onInlineSave({ amount: parsed });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
                if (e.key === "Escape") {
                  setAmountDraft(deal.amount != null ? String(deal.amount) : "");
                  setAmountEdit(false);
                }
              }}
            />
          ) : (
            <button
              type="button"
              className="mt-1 cursor-pointer rounded px-1.5 py-0.5 text-left text-base font-semibold text-indigo-900 hover:bg-indigo-50"
              onClick={() => setAmountEdit(true)}
              disabled={inlineSaving || deleteDisabled}
              title="Click to edit amount"
            >
              {formatDealAmountUsd(deal.amount) ?? "Set amount"}
            </button>
          )}
          <p className={`mt-1 text-xs font-medium ${taskSignal.textClass}`}>
            {taskSignal.text}
          </p>
          {deal.created_at ? (
            <p className="mt-1 text-xs text-gray-500">
              Created: {formatCreatedRelative(deal.created_at)}
            </p>
          ) : null}
          {needsAttention ? (
            <p className="mt-1 inline-flex animate-pulse items-center gap-1 text-xs font-semibold text-amber-900">
              <span aria-hidden>⚠️</span>
              <span>Needs attention</span>
            </p>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {onQuickAddTask ? (
            <DealQuickTaskMenu
              busy={quickAddingTask}
              disabled={deleteDisabled}
              onSelect={(preset, customContent) => {
                void onQuickAddTask(preset, customContent);
              }}
            />
          ) : null}
          {hasOpenTask && onQuickCompleteFirstTask ? (
            <button
              type="button"
              className="cursor-pointer rounded border border-emerald-600 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={quickCompleting || deleteDisabled}
              onClick={(e) => {
                e.stopPropagation();
                void onQuickCompleteFirstTask();
              }}
            >
              {quickCompleting ? "…" : "✔ Complete"}
            </button>
          ) : null}
          {onMoveToFallbackStage ? (
            <select
              className="cursor-pointer rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={movingStage || deleteDisabled}
              defaultValue=""
              onChange={(e) => {
                const value = e.target.value as StageFallbackPreset | "";
                if (!value) return;
                void onMoveToFallbackStage(value);
                e.currentTarget.value = "";
              }}
            >
              <option value="" disabled>
                Move to →
              </option>
              <option value="new">New</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won</option>
            </select>
          ) : null}
        </div>
        {suggestedActions.length > 0 && onSuggestedAction ? (
          <div className="mt-2.5 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-2">
            <p className="text-xs font-semibold text-indigo-800">
              💡 Suggested actions
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {suggestedActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  className="cursor-pointer rounded border border-indigo-500 bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={suggestedActionLoading || deleteDisabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    void onSuggestedAction(action);
                  }}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {topTasks.length > 0 ? (
          <div className="mt-2 rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
            <p className="text-[11px] font-medium text-gray-700">📌 Tasks</p>
            <ul className="mt-1 space-y-1">
              {topTasks.map((task) => {
                const id = String(task.id);
                const completed = completedLocalIds.has(id);
                const dueCmp =
                  task.due_date && !completed ? dueDateVsToday(task.due_date) : 1;
                const isOverdue = dueCmp < 0;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={`flex w-full cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 ${
                        completed ? "text-gray-500 line-through" : isOverdue ? "text-red-700" : "text-gray-700"
                      }`}
                      disabled={completed || completingTaskId === id || !onTaskComplete}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!onTaskComplete) return;
                        setCompletedLocalIds((prev) => new Set(prev).add(id));
                        void onTaskComplete(id);
                      }}
                    >
                      <span aria-hidden>{completed ? "✔" : "☐"}</span>
                      <span className="truncate">
                        {completed ? "Completed" : task.content || "Task"}
                      </span>
                      {isOverdue ? <span aria-hidden>⚠️</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
        <div className="mt-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-slate-700">Notes</p>
            {onAddNote ? (
              <button
                type="button"
                className="cursor-pointer rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={addingNote || deleteDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  void onAddNote();
                }}
              >
                {addingNote ? "..." : "📝 Add note"}
              </button>
            ) : null}
          </div>
          {sortedNotes.length === 0 ? (
            <p className="text-xs text-slate-500">No notes yet.</p>
          ) : (
            <ul className="space-y-1">
              {sortedNotes.map((note) => (
                <li key={String(note.id)} className="text-xs text-slate-700">
                  {note.content ? String(note.content) : "Note"}{" "}
                  <span className="text-slate-500">
                    {new Date(note.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {lastActivity ? (
            <p className="mt-1 text-[11px] text-slate-600">
              Last activity: {lastActivity.content || "Note"} {" · "}
              {new Date(lastActivity.created_at).toLocaleString()}
            </p>
          ) : null}
        </div>
        {inlineSaving || movingStage ? (
          <p className="mt-1 text-xs text-gray-500">Saving...</p>
        ) : null}
        <button
          type="button"
          className="mt-2 text-xs text-red-600 hover:underline disabled:opacity-50"
          disabled={deleteDisabled}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(deal);
          }}
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
