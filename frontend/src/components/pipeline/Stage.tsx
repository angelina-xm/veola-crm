"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import DealCard from "./DealCard";
import type { TaskPreset } from "@/src/lib/quickTask";
import type { StageFallbackPreset, SuggestedAction } from "./DealCard";
import { Activity, Client, Deal, PipelineStage } from "@/src/types";

export default function Stage({
  stage,
  deals,
  clients = [],
  openTasksByDealId = {},
  isLoading = false,
  deletingDealId,
  dragDisabled = false,
  onDealOpen,
  onDealDelete,
  highlightDealIds,
  filterDimActive,
  onQuickCompleteFirstTask,
  quickCompletingDealId,
  onQuickAddTask,
  quickAddingTaskDealId,
  onInlineSaveDeal,
  inlineSavingDealId,
  onMoveToFallbackStage,
  movingStageDealId,
  onSuggestedAction,
  suggestedActionLoadingDealId,
  attentionDealIds,
  onTaskComplete,
  completingTaskId,
  priorityLabel,
}: {
  stage: PipelineStage;
  deals: Deal[];
  clients?: Client[];
  openTasksByDealId?: Record<string, Activity[]>;
  highlightDealIds?: Set<string>;
  filterDimActive?: boolean;
  onQuickCompleteFirstTask?: (dealId: string) => void | Promise<void>;
  quickCompletingDealId?: string | null;
  onQuickAddTask?: (
    dealId: string,
    preset: TaskPreset,
    customContent?: string
  ) => void | Promise<void>;
  quickAddingTaskDealId?: string | null;
  onInlineSaveDeal?: (
    dealId: string,
    patch: { title?: string; amount?: number }
  ) => void | Promise<void>;
  inlineSavingDealId?: string | null;
  onMoveToFallbackStage?: (
    dealId: string,
    preset: StageFallbackPreset
  ) => void | Promise<void>;
  movingStageDealId?: string | null;
  onSuggestedAction?: (
    dealId: string,
    action: SuggestedAction
  ) => void | Promise<void>;
  suggestedActionLoadingDealId?: string | null;
  attentionDealIds?: Set<string>;
  onTaskComplete?: (taskId: string) => void | Promise<void>;
  completingTaskId?: string | null;
  priorityLabel?: "high" | "medium" | "low" | null;
  isLoading?: boolean;
  deletingDealId: string | null;
  dragDisabled?: boolean;
  onDealOpen: (deal: Deal) => void;
  onDealDelete: (deal: Deal) => void;
}) {
  // ✅ защита от "deals не массив"
  const safeDeals = Array.isArray(deals) ? deals : [];

  const { setNodeRef } = useDroppable({
    id: `stage-${String(stage.id)}`,
    data: {
      stageId: String(stage.id),
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-64 bg-gray-100 p-3 rounded min-h-[200px] ${
        isLoading ? "opacity-70" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-bold">{stage.name}</h2>
        {priorityLabel ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              priorityLabel === "high"
                ? "bg-red-100 text-red-700"
                : priorityLabel === "medium"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-700"
            }`}
          >
            {priorityLabel === "high"
              ? "🔥 High priority"
              : priorityLabel === "medium"
                ? "⚠️ Medium"
                : "🧊 Low"}
          </span>
        ) : null}
      </div>

      <SortableContext
        items={safeDeals.map((d) => `deal-${String(d.id)}`)}
        strategy={verticalListSortingStrategy}
      >
        {safeDeals.map((deal, index) => {
          const id = String(deal.id);
          const hs = highlightDealIds ?? new Set<string>();
          const spot = Boolean(filterDimActive && hs.has(id));
          const dim = Boolean(filterDimActive && !hs.has(id));
          return (
          <DealCard
            key={deal.id}
            deal={deal}
            index={index}
            stageId={String(stage.id)}
            clients={clients}
            openTasksForDeal={openTasksByDealId[String(deal.id)] ?? []}
            spotlight={spot}
            dimmed={dim}
            isDeleting={deletingDealId === String(deal.id)}
            deleteDisabled={deletingDealId !== null}
            dragDisabled={dragDisabled}
            onOpen={onDealOpen}
            onDelete={onDealDelete}
            stageName={stage.name}
            onQuickCompleteFirstTask={
              onQuickCompleteFirstTask
                ? () => void onQuickCompleteFirstTask(id)
                : undefined
            }
            quickCompleting={
              quickCompletingDealId !== undefined &&
              quickCompletingDealId !== null &&
              quickCompletingDealId === id
            }
            onQuickAddTask={
              onQuickAddTask
                ? (preset, custom) => void onQuickAddTask(id, preset, custom)
                : undefined
            }
            quickAddingTask={
              quickAddingTaskDealId !== undefined &&
              quickAddingTaskDealId !== null &&
              quickAddingTaskDealId === id
            }
            onInlineSave={
              onInlineSaveDeal
                ? (patch) => void onInlineSaveDeal(id, patch)
                : undefined
            }
            inlineSaving={
              inlineSavingDealId !== undefined &&
              inlineSavingDealId !== null &&
              inlineSavingDealId === id
            }
            onMoveToFallbackStage={
              onMoveToFallbackStage
                ? (preset) => void onMoveToFallbackStage(id, preset)
                : undefined
            }
            movingStage={
              movingStageDealId !== undefined &&
              movingStageDealId !== null &&
              movingStageDealId === id
            }
            onSuggestedAction={
              onSuggestedAction
                ? (action) => void onSuggestedAction(id, action)
                : undefined
            }
            suggestedActionLoading={
              suggestedActionLoadingDealId !== undefined &&
              suggestedActionLoadingDealId !== null &&
              suggestedActionLoadingDealId === id
            }
            needsAttention={Boolean(attentionDealIds?.has(id))}
            onTaskComplete={onTaskComplete}
            completingTaskId={completingTaskId}
          />
          );
        })}
      </SortableContext>
    </div>
  );
}