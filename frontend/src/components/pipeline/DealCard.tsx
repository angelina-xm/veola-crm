"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DealCardBody from "./DealCardBody";
import {
  resolveDealAttentionVisual,
} from "@/src/lib/dealAttention";
import { relationshipStatusLabel } from "@/src/lib/clientRelationship";
import { dueDateVsToday } from "@/src/lib/dealTaskSignal";
import type { TaskPreset } from "@/src/lib/quickTask";
import { cn } from "@/src/lib/cn";
import { DAY_MS, scaleMs } from "@/src/lib/timeConfig";
import { suggestedActionLabel } from "@/src/lib/i18nHelpers";
import { translate } from "@/src/i18n/translate";
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

function daysSinceTouch(iso?: string): number | null {
  if (!iso) return null;
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return null;
  return Math.floor((Date.now() - ts) / 86_400_000);
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

export function DealCardPreview(props: {
  deal: Deal;
  clients?: Client[];
  openTasksForDeal?: Activity[];
  stageName?: string;
  closingSoon?: boolean;
  needsAttention?: boolean;
  notes?: Activity[];
}) {
  const {
    deal,
    clients = [],
    openTasksForDeal = [],
    stageName,
    closingSoon = false,
    needsAttention = false,
    notes = [],
  } = props;
  const dealHealth = getDealHealth(deal, openTasksForDeal);
  const visual = resolveDealAttentionVisual(dealHealth, needsAttention, closingSoon);
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
  const idleDays = daysSinceTouch(lastTouchIso(deal, openTasksForDeal, notes));

  return (
    <DealCardBody
      deal={deal}
      clients={clients}
      openTasksForDeal={openTasksForDeal}
      notes={notes}
      stageName={stageName}
      visual={visual}
      isOverdue={isOverdue}
      daysIdle={idleDays}
      nextStep={
        nextTask?.content?.trim() ||
        getSuggestedActions(deal, stageName, openTasksForDeal)[0] ||
        deal.title
      }
      nextTaskDue={nextTask?.due_date ?? undefined}
      shellOpts={{ dragging: true }}
    />
  );
}

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
  const idleDays = daysSinceTouch(lastTouchIso(deal, openTasksForDeal, notes));

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
    transition: transition ?? "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "mb-3.5 cursor-grab touch-none active:cursor-grabbing",
        sortableDragging && "relative z-0",
        dragDisabled && "cursor-default"
      )}
      {...attributes}
      {...listeners}
    >
      <DealCardBody
        deal={deal}
        clients={clients}
        openTasksForDeal={openTasksForDeal}
        notes={notes}
        stageName={stageName}
        visual={visual}
        isOverdue={isOverdue}
        daysIdle={idleDays}
        nextStep={
          nextTask?.content?.trim() ||
          suggestedActions[0]
            ? suggestedActionLabel(suggestedActions[0])
            : translate("pipeline.reviewDeal")
        }
        nextTaskDue={nextTask?.due_date ?? undefined}
        shellOpts={{
          dragging: sortableDragging,
          dimmed,
          spotlight,
        }}
        onOpen={() => onOpen(deal)}
        savingLine={inlineSaving || movingStage || isDeleting}
        footerActions={
          <>
            {onQuickAddTask ? (
              <DealQuickTaskMenu
                busy={quickAddingTask}
                disabled={deleteDisabled}
                onSelect={(preset, custom) => void onQuickAddTask(preset, custom)}
              />
            ) : null}
            <button
              type="button"
              className="vx-btn-ghost px-2 py-1 text-[10px] opacity-0 transition-opacity group-hover:opacity-100 [.vx-deal-card:hover_&]:opacity-100"
              onClick={() => onOpen(deal)}
            >
              Open
            </button>
          </>
        }
      />
    </div>
  );
}
