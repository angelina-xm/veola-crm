"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import {
  clientNameById,
  formatCreatedRelative,
  formatDealAmountUsd,
} from "@/src/lib/dealDisplay";
import {
  dealCardShellClass,
  dealHealthChipClass,
  dealHealthLabel,
  resolveDealAttentionVisual,
} from "@/src/lib/dealAttention";
import { dueDateVsToday, getDealTaskSignal } from "@/src/lib/dealTaskSignal";
import type { TaskPreset } from "@/src/lib/quickTask";
import { cn } from "@/src/lib/cn";
import { DAY_MS, scaleMs } from "@/src/lib/timeConfig";
import { Activity, Client, Deal } from "@/src/types";
import DealQuickTaskMenu from "./DealQuickTaskMenu";

export type StageFallbackPreset = "new" | "negotiation";
export type SuggestedAction = "Call client" | "Send proposal" | "Follow up";
export type DealHealth = "urgent" | "at_risk" | "cold";

const HEALTH_STALE_MS = scaleMs(
  process.env.NEXT_PUBLIC_DEV_FAST === "true" ? 60 * 1000 : 48 * 60 * 60 * 1000
);
const FOLLOW_UP_SUGGEST_MS = scaleMs(2 * DAY_MS);

export function getDealHealth(deal: Deal, activities: Activity[] = []): DealHealth {
  const hasOverdueTasks = activities.some((a) => {
    if (a.type !== "task" || a.is_completed || !a.due_date) return false;
    return dueDateVsToday(a.due_date) < 0;
  });
  if (hasOverdueTasks) return "urgent";

  const lastActivityTs = activities.reduce((maxTs, item) => {
    const ts = new Date(item.created_at).getTime();
    return Number.isFinite(ts) ? Math.max(maxTs, ts) : maxTs;
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
    return Number.isFinite(ts) ? Math.max(maxTs, ts) : maxTs;
  }, Number.isFinite(new Date(deal.created_at ?? "").getTime())
    ? new Date(deal.created_at as string).getTime()
    : 0);
  if (Date.now() - lastActivityTs > FOLLOW_UP_SUGGEST_MS) {
    out.push("Follow up");
  }

  const existing = new Set(
    activities
      .filter((a) => a.type === "task" && !a.is_completed)
      .map((a) => String(a.content ?? "").trim().toLowerCase())
  );
  return out.filter((label) => !existing.has(label.trim().toLowerCase()));
}

export function DealCardContent({
  deal,
  clients = [],
  openTasksForDeal = [],
}: {
  deal: Deal;
  clients?: Client[];
  openTasksForDeal?: Activity[];
}) {
  const clientLine =
    clientNameById(clients, deal.client) ??
    (deal.client != null && deal.client !== "" ? String(deal.client) : "No client");
  const taskSignal = getDealTaskSignal(openTasksForDeal);

  return (
    <>
      <p className="text-sm font-semibold text-[var(--vx-text)]">{clientLine}</p>
      <p className="mt-0.5 truncate text-xs text-[var(--vx-text-muted)]">{deal.title}</p>
      {formatDealAmountUsd(deal.amount) ? (
        <p className="mt-1 text-sm font-medium text-[var(--vx-text-secondary)] vx-tabular">
          {formatDealAmountUsd(deal.amount)}
        </p>
      ) : null}
      <p className={cn("mt-1 text-[11px]", taskSignal.textClass)}>{taskSignal.text}</p>
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
  isDragging = false,
}: {
  deal: Deal;
  index: number;
  stageId: string;
  clients?: Client[];
  openTasksForDeal?: Activity[];
  spotlight?: boolean;
  dimmed?: boolean;
  isDragging?: boolean;
  onQuickCompleteFirstTask?: () => void | Promise<void>;
  quickCompleting?: boolean;
  onQuickAddTask?: (preset: TaskPreset, customContent?: string) => void | Promise<void>;
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
  const dealHealth = getDealHealth(deal, openTasksForDeal);
  const visual = resolveDealAttentionVisual(dealHealth, needsAttention);
  const healthLabel = dealHealthLabel(visual);
  const suggestedActions = getSuggestedActions(deal, stageName, openTasksForDeal);

  const clientLine =
    clientNameById(clients, deal.client) ??
    (deal.client != null && deal.client !== "" ? String(deal.client) : "No client");

  const nextTask = [...openTasksForDeal]
    .filter((t) => t.type === "task" && !t.is_completed)
    .sort((a, b) => {
      const aDue = a.due_date ? dueDateVsToday(a.due_date) : 99;
      const bDue = b.due_date ? dueDateVsToday(b.due_date) : 99;
      return aDue - bDue;
    })[0];

  const lastNote = [...notes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableDragging,
  } = useSortable({
    id: `deal-${String(deal.id)}`,
    disabled: dragDisabled,
    data: { stageId, index, dealId: String(deal.id) },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragging = isDragging || sortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        dealCardShellClass(visual, { dragging, dimmed, spotlight }),
        "mb-2.5 cursor-grab active:cursor-grabbing",
        dragDisabled && "cursor-default"
      )}
      {...attributes}
      {...listeners}
    >
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(deal);
            }}
          >
            <p className="truncate text-[13px] font-semibold text-[var(--vx-text)]">
              {clientLine}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-[var(--vx-text-muted)]">
              {deal.title}
            </p>
          </button>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {formatDealAmountUsd(deal.amount) ? (
              <span className="text-sm font-semibold tracking-tight text-[var(--vx-text)] vx-tabular">
                {formatDealAmountUsd(deal.amount)}
              </span>
            ) : null}
            {healthLabel ? (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                  dealHealthChipClass(visual)
                )}
              >
                {healthLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-2.5 space-y-1 border-t border-[var(--vx-border-subtle)] pt-2.5">
          {lastNote ? (
            <p className="line-clamp-1 text-[11px] text-[var(--vx-text-secondary)]">
              <span className="text-[var(--vx-text-muted)]">Last · </span>
              {lastNote.content || "Note"}
            </p>
          ) : (
            <p className="text-[11px] text-[var(--vx-text-muted)]">
              No recent activity
              {deal.created_at ? ` · ${formatCreatedRelative(deal.created_at)}` : ""}
            </p>
          )}
          {nextTask ? (
            <p className={cn("line-clamp-1 text-[11px] font-medium", taskSignal.textClass)}>
              Next · {nextTask.content || "Follow-up"}
              {nextTask.due_date
                ? ` · ${dueDateVsToday(nextTask.due_date) < 0 ? "Overdue" : dueDateVsToday(nextTask.due_date) === 0 ? "Today" : "Scheduled"}`
                : ""}
            </p>
          ) : (
            <p className="text-[11px] text-[var(--vx-text-muted)]">{taskSignal.text}</p>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap gap-1">
            {suggestedActions.length > 0 && onSuggestedAction ? (
              <button
                type="button"
                className="rounded-md border border-[var(--vx-accent)]/20 bg-[var(--vx-accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--vx-accent)] hover:bg-[var(--vx-accent-soft)]"
                disabled={suggestedActionLoading || deleteDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  void onSuggestedAction(suggestedActions[0]);
                }}
              >
                {suggestedActions[0]}
              </button>
            ) : null}
          </div>
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {onQuickAddTask ? (
              <DealQuickTaskMenu
                busy={quickAddingTask}
                disabled={deleteDisabled}
                onSelect={(preset, custom) => void onQuickAddTask(preset, custom)}
              />
            ) : null}
            <button
              type="button"
              className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[var(--vx-text-muted)] hover:bg-[var(--vx-bg-subtle)] hover:text-[var(--vx-text)]"
              onClick={() => onOpen(deal)}
            >
              Open
            </button>
          </div>
        </div>

        {(inlineSaving || movingStage || isDeleting) && (
          <p className="mt-1 text-[10px] text-[var(--vx-text-muted)]">Saving…</p>
        )}
      </div>
    </div>
  );
}
