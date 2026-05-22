"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/src/lib/cn";
import { formatDealAmountUsd } from "@/src/lib/dealDisplay";
import { sumDealAmounts } from "@/src/lib/dealAttention";
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
  isOver = false,
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
  notesByDealId,
  onAddNote,
  addingNoteDealId,
}: {
  stage: PipelineStage;
  deals: Deal[];
  clients?: Client[];
  openTasksByDealId?: Record<string, Activity[]>;
  highlightDealIds?: Set<string>;
  filterDimActive?: boolean;
  isOver?: boolean;
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
  notesByDealId?: Record<string, Activity[]>;
  onAddNote?: (dealId: string) => void | Promise<void>;
  addingNoteDealId?: string | null;
  isLoading?: boolean;
  deletingDealId: string | null;
  dragDisabled?: boolean;
  onDealOpen: (deal: Deal) => void;
  onDealDelete: (deal: Deal) => void;
}) {
  const safeDeals = Array.isArray(deals) ? deals : [];
  const totalValue = sumDealAmounts(safeDeals);

  const { setNodeRef, isOver: dropOver } = useDroppable({
    id: `stage-${String(stage.id)}`,
    data: { stageId: String(stage.id) },
  });

  const activeDrop = isOver || dropOver;

  return (
    <div
      className={cn(
        "vx-deals-column flex flex-col overflow-hidden rounded-2xl transition-all duration-300",
        "border border-[var(--vx-border-subtle)] bg-[var(--vx-column-bg)]",
        activeDrop && "ring-1 ring-[var(--vx-accent)]/20",
        isLoading && "opacity-60"
      )}
    >
      <div className="sticky top-0 z-10 border-b border-[var(--vx-border-subtle)] bg-[var(--vx-column-bg)]/95 px-4 py-3.5 backdrop-blur-md">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="truncate text-[13px] font-medium text-[var(--vx-text)]">
            {stage.name}
          </h2>
          <span className="shrink-0 text-[12px] font-medium text-[var(--vx-text-muted)] vx-tabular">
            {safeDeals.length}
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--vx-text-muted)] vx-tabular">
          {formatDealAmountUsd(totalValue) ?? "$0"}
        </p>
      </div>

      <div ref={setNodeRef} className="min-h-[14rem] flex-1 px-3 py-3">
        <SortableContext
          items={safeDeals.map((d) => `deal-${String(d.id)}`)}
          strategy={verticalListSortingStrategy}
        >
          {safeDeals.length === 0 ? (
            <div
              className={cn(
                "flex min-h-[10rem] flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition-colors duration-300",
                activeDrop
                  ? "border-[var(--vx-accent)]/25 bg-[var(--vx-accent-soft)]/10"
                  : "border-[var(--vx-border)] bg-[var(--vx-card-bg)]/30"
              )}
            >
              <p className="text-[12px] font-medium text-[var(--vx-text-muted)]">
                Drop deals here
              </p>
            </div>
          ) : (
            safeDeals.map((deal, index) => {
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
                  openTasksForDeal={openTasksByDealId[id] ?? []}
                  spotlight={spot}
                  dimmed={dim}
                  isDeleting={deletingDealId === id}
                  deleteDisabled={deletingDealId !== null}
                  dragDisabled={dragDisabled}
                  onOpen={onDealOpen}
                  onDelete={onDealDelete}
                  stageName={stage.name}
                  onQuickAddTask={
                    onQuickAddTask
                      ? (preset, custom) => void onQuickAddTask(id, preset, custom)
                      : undefined
                  }
                  quickAddingTask={quickAddingTaskDealId === id}
                  onSuggestedAction={
                    onSuggestedAction
                      ? (action) => void onSuggestedAction(id, action)
                      : undefined
                  }
                  suggestedActionLoading={suggestedActionLoadingDealId === id}
                  needsAttention={Boolean(attentionDealIds?.has(id))}
                  notes={notesByDealId?.[id] ?? []}
                />
              );
            })
          )}
        </SortableContext>
      </div>
    </div>
  );
}
