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
import { getDealTaskSignal, type DealTaskSignal } from "@/src/lib/dealTaskSignal";
import type { TaskPreset } from "@/src/lib/quickTask";
import { Activity, Client, Deal } from "@/src/types";
import DealQuickTaskMenu from "./DealQuickTaskMenu";

export type StageFallbackPreset = "new" | "negotiation" | "won";
export type SuggestedAction = "Call client" | "Send proposal" | "Follow up";

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
  if (staleForMs > 2 * 24 * 60 * 60 * 1000) {
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
  const suggestedActions = getSuggestedActions(deal, stageName, openTasksForDeal);
  const [titleEdit, setTitleEdit] = useState(false);
  const [amountEdit, setAmountEdit] = useState(false);
  const [titleDraft, setTitleDraft] = useState(deal.title);
  const [amountDraft, setAmountDraft] = useState(
    deal.amount != null ? String(deal.amount) : ""
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
  const dimClass = dimmed ? "opacity-40" : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mb-2 flex gap-1 overflow-hidden rounded bg-white shadow ${taskSignal.borderClass} ${focusRing} ${dimClass}`}
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
      <div className="min-w-0 flex-1 py-2 pr-2">
        <div className="w-full text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
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
                  className="cursor-pointer rounded px-1 text-left text-sm font-semibold text-gray-900 hover:bg-gray-100"
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
          <p className="mt-1 text-xs text-gray-600">
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
              className="mt-1 cursor-pointer rounded px-1 text-left text-sm font-medium text-gray-900 hover:bg-gray-100"
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
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
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
          <div className="mt-2 rounded border border-indigo-100 bg-indigo-50 px-2 py-1.5">
            <p className="text-[11px] font-medium text-indigo-700">
              💡 Suggested actions
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {suggestedActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  className="cursor-pointer rounded border border-indigo-300 bg-white px-2 py-0.5 text-[11px] text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
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
