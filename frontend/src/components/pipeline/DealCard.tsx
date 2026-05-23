"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DealAvatar from "./DealAvatar";
import {
  assigneeLabel,
  clientById,
  clientNameById,
  daysInStage,
  formatActivityShort,
  formatDealAmountUsd,
  inferStageProbability,
} from "@/src/lib/dealDisplay";
import {
  dealCardShellClass,
  dealStatusBadges,
  resolveDealAttentionVisual,
} from "@/src/lib/dealAttention";
import { relationshipStatusLabel } from "@/src/lib/clientRelationship";
import { dueDateVsToday } from "@/src/lib/dealTaskSignal";
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

const BADGE_CLASS: Record<string, string> = {
  neutral: "bg-[var(--vx-bg-subtle)] text-[var(--vx-text-muted)]",
  warn: "bg-amber-500/12 text-amber-200/90",
  risk: "bg-rose-500/12 text-rose-200/90",
  closing: "bg-violet-500/12 text-violet-200/90",
  positive: "bg-emerald-500/12 text-emerald-300/90",
};

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

function lastTouchIso(
  deal: Deal,
  openTasks: Activity[],
  notes: Activity[]
): string | undefined {
  const candidates: number[] = [];
  if (deal.created_at) {
    const t = new Date(deal.created_at).getTime();
    if (Number.isFinite(t)) candidates.push(t);
  }
  for (const a of [...openTasks, ...notes]) {
    const t = new Date(a.created_at).getTime();
    if (Number.isFinite(t)) candidates.push(t);
  }
  if (!candidates.length) return undefined;
  return new Date(Math.max(...candidates)).toISOString();
}

function daysSinceTouch(iso?: string): number | null {
  if (!iso) return null;
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return null;
  return Math.floor((Date.now() - ts) / 86_400_000);
}

export function DealCardPreview({
  deal,
  clients = [],
  openTasksForDeal = [],
  stageName,
  closingSoon = false,
  needsAttention = false,
  notes = [],
}: {
  deal: Deal;
  clients?: Client[];
  openTasksForDeal?: Activity[];
  stageName?: string;
  closingSoon?: boolean;
  needsAttention?: boolean;
  notes?: Activity[];
}) {
  const client = clientById(clients, deal.client);
  const clientLine =
    client?.name ??
    (deal.client != null && deal.client !== "" ? String(deal.client) : "No client");
  const dealHealth = getDealHealth(deal, openTasksForDeal);
  const visual = resolveDealAttentionVisual(dealHealth, needsAttention, closingSoon);
  const amount = formatDealAmountUsd(deal.amount);
  const probability = inferStageProbability(stageName);
  const touchIso = lastTouchIso(deal, openTasksForDeal, notes);
  const idleDays = daysSinceTouch(touchIso);

  const nextTask = [...openTasksForDeal]
    .filter((t) => t.type === "task" && !t.is_completed)
    .sort((a, b) => {
      const aDue = a.due_date ? dueDateVsToday(a.due_date) : 99;
      const bDue = b.due_date ? dueDateVsToday(b.due_date) : 99;
      return aDue - bDue;
    })[0];

  const isOverdue = Boolean(
    nextTask?.due_date && dueDateVsToday(nextTask.due_date) < 0
  );

  const badges = dealStatusBadges({
    visual,
    isOverdue,
    daysIdle: idleDays,
    relationshipLabel: client?.relationship_status
      ? relationshipStatusLabel(client.relationship_status)
      : null,
  });

  const nextStep =
    nextTask?.content?.trim() ||
    getSuggestedActions(deal, stageName, openTasksForDeal)[0] ||
    deal.title;

  const ownerEmail = deal.assigned_to_email ?? null;
  const stageDays = daysInStage(deal.created_at);

  return (
    <article className={dealCardShellClass(visual, { dragging: true })}>
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          <DealAvatar label={clientLine} tone="client" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold leading-snug tracking-tight text-[var(--vx-text)]">
                  {clientLine}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[var(--vx-text-muted)]">
                  {deal.title}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {amount ? (
                  <p className="text-[14px] font-semibold tracking-tight text-[var(--vx-text)] vx-tabular">
                    {amount}
                  </p>
                ) : null}
                {probability != null ? (
                  <p className="text-[10px] text-[var(--vx-text-muted)] vx-tabular">
                    {probability}%
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {badges.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {badges.map((b) => (
              <span
                key={b.label}
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                  BADGE_CLASS[b.tone]
                )}
              >
                {b.label}
              </span>
            ))}
          </div>
        ) : null}

        <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-snug text-[var(--vx-text-secondary)]">
          <span className="mt-px shrink-0 text-[var(--vx-text-muted)]" aria-hidden>
            →
          </span>
          <span className="line-clamp-2">{nextStep}</span>
        </p>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--vx-border-subtle)] pt-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <DealAvatar
              label={assigneeLabel(ownerEmail)}
              tone="assignee"
              size="sm"
              title={ownerEmail ?? "Unassigned"}
            />
            <span className="truncate text-[10px] text-[var(--vx-text-muted)]">
              {formatActivityShort(touchIso)}
            </span>
          </div>
          {stageDays != null ? (
            <span className="flex shrink-0 items-center gap-1 text-[10px] text-[var(--vx-text-muted)] vx-tabular">
              <ClockIcon />
              {stageDays}d
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** @deprecated Use DealCardPreview — kept for DragOverlay compatibility alias */
export function DealCardContent(props: Parameters<typeof DealCardPreview>[0]) {
  return <DealCardPreview {...props} />;
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
  needsAttention = false,
  closingSoon = false,
  notes = [],
  onDelete: _onDelete,
}: {
  deal: Deal;
  index: number;
  stageId: string;
  clients?: Client[];
  openTasksForDeal?: Activity[];
  spotlight?: boolean;
  dimmed?: boolean;
  closingSoon?: boolean;
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
  const visual = resolveDealAttentionVisual(dealHealth, needsAttention, closingSoon);
  const suggestedActions = getSuggestedActions(deal, stageName, openTasksForDeal);

  const client = clientById(clients, deal.client);
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

  const isOverdue = Boolean(
    nextTask?.due_date && dueDateVsToday(nextTask.due_date) < 0
  );

  const touchIso = lastTouchIso(deal, openTasksForDeal, notes);
  const idleDays = daysSinceTouch(touchIso);
  const badges = dealStatusBadges({
    visual,
    isOverdue,
    daysIdle: idleDays,
    relationshipLabel: client?.relationship_status
      ? relationshipStatusLabel(client.relationship_status)
      : null,
  });

  const nextStep =
    nextTask?.content?.trim() ||
    suggestedActions[0] ||
    "Review deal";

  const amount = formatDealAmountUsd(deal.amount);
  const probability = inferStageProbability(stageName);
  const ownerEmail = deal.assigned_to_email ?? null;
  const stageDays = daysInStage(deal.created_at);

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
    transition: transition ?? "transform 200ms cubic-bezier(0.2, 0, 0, 1)",
  };

  const dragging = sortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        dealCardShellClass(visual, { dragging, dimmed, spotlight }),
        "mb-3 cursor-grab touch-none active:cursor-grabbing",
        dragDisabled && "cursor-default"
      )}
      {...attributes}
      {...listeners}
    >
      <div className="p-3.5">
        <button
          type="button"
          className="flex w-full items-start gap-3 text-left"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(deal);
          }}
        >
          <DealAvatar label={clientLine} tone="client" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold leading-snug tracking-tight text-[var(--vx-text)]">
                  {clientLine}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[var(--vx-text-muted)]">
                  {deal.title}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {amount ? (
                  <p className="text-[14px] font-semibold tracking-tight text-[var(--vx-text)] vx-tabular">
                    {amount}
                  </p>
                ) : null}
                {probability != null ? (
                  <p className="text-[10px] text-[var(--vx-text-muted)] vx-tabular">
                    {probability}%
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </button>

        {badges.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1 px-0.5">
            {badges.map((b) => (
              <span
                key={b.label}
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                  BADGE_CLASS[b.tone]
                )}
              >
                {b.label}
              </span>
            ))}
          </div>
        ) : null}

        <p
          className={cn(
            "mt-2.5 flex items-start gap-1.5 px-0.5 text-[11px] leading-snug",
            isOverdue
              ? "text-amber-300/90"
              : "text-[var(--vx-text-secondary)]"
          )}
        >
          <span className="mt-px shrink-0 text-[var(--vx-text-muted)]" aria-hidden>
            →
          </span>
          <span className="line-clamp-2">{nextStep}</span>
        </p>

        <div
          className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--vx-border-subtle)] pt-2.5"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex min-w-0 items-center gap-2">
            <DealAvatar
              label={assigneeLabel(ownerEmail)}
              tone="assignee"
              size="sm"
              title={ownerEmail ?? "Unassigned"}
            />
            <span className="truncate text-[10px] text-[var(--vx-text-muted)]">
              {formatActivityShort(touchIso)}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {stageDays != null ? (
              <span className="flex items-center gap-1 text-[10px] text-[var(--vx-text-muted)] vx-tabular">
                <ClockIcon />
                {stageDays}d
              </span>
            ) : null}
            {onQuickAddTask ? (
              <DealQuickTaskMenu
                busy={quickAddingTask}
                disabled={deleteDisabled}
                onSelect={(preset, custom) => void onQuickAddTask(preset, custom)}
              />
            ) : null}
            <button
              type="button"
              className="vx-btn-ghost px-2 py-1 text-[10px]"
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
