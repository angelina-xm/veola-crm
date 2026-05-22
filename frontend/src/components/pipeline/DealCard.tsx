"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  clientNameById,
  formatCreatedRelative,
  formatDealAmountUsd,
} from "@/src/lib/dealDisplay";
import {
  dealCardShellClass,
  dealHealthDotClass,
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

  return (
    <>
      <p className="text-[14px] font-semibold leading-snug text-[var(--vx-text)]">
        {clientLine}
      </p>
      <p className="mt-1 truncate text-[12px] text-[var(--vx-text-muted)]">{deal.title}</p>
      {formatDealAmountUsd(deal.amount) ? (
        <p className="mt-2 text-[13px] font-medium text-[var(--vx-text-secondary)] vx-tabular">
          {formatDealAmountUsd(deal.amount)}
        </p>
      ) : null}
    </>
  );
}

function taskMetaLine(
  nextTask: Activity | undefined,
  lastNote: Activity | undefined,
  createdAt?: string
): string {
  if (nextTask) {
    const due =
      nextTask.due_date && dueDateVsToday(nextTask.due_date) < 0
        ? "Overdue"
        : nextTask.due_date && dueDateVsToday(nextTask.due_date) === 0
          ? "Today"
          : null;
    return [nextTask.content || "Follow-up", due].filter(Boolean).join(" · ");
  }
  if (lastNote?.content) return lastNote.content;
  if (createdAt) return formatCreatedRelative(createdAt);
  return "No recent activity";
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
  openTasksForDeal = [],
  spotlight = false,
  dimmed = false,
  onQuickAddTask,
  quickAddingTask = false,
  inlineSaving = false,
  movingStage = false,
  stageName,
  onSuggestedAction,
  suggestedActionLoading = false,
  needsAttention = false,
  notes = [],
}: {
  deal: Deal;
  index: number;
  stageId: string;
  clients?: Client[];
  openTasksForDeal?: Activity[];
  spotlight?: boolean;
  dimmed?: boolean;
  onQuickAddTask?: (preset: TaskPreset, customContent?: string) => void | Promise<void>;
  quickAddingTask?: boolean;
  inlineSaving?: boolean;
  movingStage?: boolean;
  stageName?: string;
  onSuggestedAction?: (label: SuggestedAction) => void | Promise<void>;
  suggestedActionLoading?: boolean;
  needsAttention?: boolean;
  notes?: Activity[];
  isDeleting?: boolean;
  deleteDisabled?: boolean;
  dragDisabled?: boolean;
  onOpen: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
}) {
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

  const meta = taskMetaLine(nextTask, lastNote, deal.created_at);
  const isOverdue = Boolean(
    nextTask?.due_date && dueDateVsToday(nextTask.due_date) < 0
  );

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

  const dragging = sortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        dealCardShellClass(visual, { dragging, dimmed, spotlight }),
        "mb-3.5 cursor-grab active:cursor-grabbing",
        dragDisabled && "cursor-default"
      )}
      {...attributes}
      {...listeners}
    >
      <div className="p-4">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-4 text-left"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(deal);
          }}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-snug tracking-tight text-[var(--vx-text)]">
              {clientLine}
            </p>
            <p className="mt-1 truncate text-[12px] leading-relaxed text-[var(--vx-text-muted)]">
              {deal.title}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {formatDealAmountUsd(deal.amount) ? (
              <span className="text-[14px] font-medium tracking-tight text-[var(--vx-text-secondary)] vx-tabular">
                {formatDealAmountUsd(deal.amount)}
              </span>
            ) : null}
            {healthLabel ? (
              <span className="flex items-center gap-1.5 text-[10px] text-[var(--vx-text-muted)]">
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", dealHealthDotClass(visual))}
                  aria-hidden
                />
                {healthLabel}
              </span>
            ) : null}
          </div>
        </button>

        <p
          className={cn(
            "mt-3 line-clamp-2 text-[12px] leading-relaxed",
            isOverdue ? "text-amber-600/90 dark:text-amber-400/80" : "text-[var(--vx-text-muted)]"
          )}
        >
          {meta}
        </p>

        <div
          className="mt-3.5 flex items-center justify-between gap-3 pt-0.5"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {suggestedActions.length > 0 && onSuggestedAction ? (
            <button
              type="button"
              className="vx-btn-ghost min-w-0 truncate px-0 text-[11px] text-[var(--vx-text-muted)] hover:text-[var(--vx-accent)]"
              disabled={suggestedActionLoading || deleteDisabled}
              onClick={() => void onSuggestedAction(suggestedActions[0])}
            >
              {suggestedActions[0]}
            </button>
          ) : (
            <span />
          )}
          <div className="flex shrink-0 items-center gap-1">
            {onQuickAddTask ? (
              <DealQuickTaskMenu
                busy={quickAddingTask}
                disabled={deleteDisabled}
                onSelect={(preset, custom) => void onQuickAddTask(preset, custom)}
              />
            ) : null}
            <button
              type="button"
              className="vx-btn-ghost text-[11px]"
              onClick={() => onOpen(deal)}
            >
              Open
            </button>
          </div>
        </div>

        {(inlineSaving || movingStage || isDeleting) && (
          <p className="mt-2 text-[10px] text-[var(--vx-text-muted)]">Saving…</p>
        )}
      </div>
    </div>
  );
}
