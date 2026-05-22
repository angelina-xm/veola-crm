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

function stageHealthTone(deals: Deal[], attentionIds?: Set<string>): "healthy" | "mixed" | "risk" {
  if (deals.length === 0) return "healthy";
  const atRisk = deals.filter((d) => attentionIds?.has(String(d.id))).length;
  if (atRisk >= Math.max(1, Math.ceil(deals.length * 0.4))) return "risk";
  if (atRisk > 0) return "mixed";
  return "healthy";
}

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
  const health = stageHealthTone(safeDeals, attentionDealIds);

  const { setNodeRef, isOver: dropOver } = useDroppable({
    id: `stage-${String(stage.id)}`,
    data: { stageId: String(stage.id) },
  });

  const activeDrop = isOver || dropOver;

  return (
    <div
      className={cn(
        "flex w-[17.5rem] shrink-0 flex-col rounded-xl transition-all duration-200",
        "border border-[var(--vx-border-subtle)] bg-[var(--vx-bg-subtle)]/80",
        activeDrop && "ring-1 ring-[var(--vx-accent)]/25 bg-[var(--vx-accent-soft)]/30",
        isLoading && "opacity-60"
      )}
    >
      <div
        className={cn(
          "sticky top-0 z-10 rounded-t-xl border-b border-[var(--vx-border-subtle)] bg-[var(--vx-surface)]/95 px-3 py-2.5 backdrop-blur-sm"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-xs font-semibold tracking-wide text-[var(--vx-text)]">
            {stage.name}
          </h2>
          <span
            className={cn(
              "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold vx-tabular",
              health === "risk" && "vx-badge-danger",
              health === "mixed" && "vx-badge-warning",
              health === "healthy" && "vx-badge-neutral"
            )}
          >
            {safeDeals.length}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-[var(--vx-text-muted)] vx-tabular">
          {formatDealAmountUsd(totalValue) ?? "$0"} total
        </p>
      </div>

      <div
        ref={setNodeRef}
        className="min-h-[12rem] flex-1 px-2 py-2.5"
      >
        <SortableContext
          items={safeDeals.map((d) => `deal-${String(d.id)}`)}
          strategy={verticalListSortingStrategy}
        >
          {safeDeals.length === 0 ? (
            <div
              className={cn(
                "flex min-h-[8rem] flex-col items-center justify-center rounded-lg border border-dashed px-3 py-6 text-center",
                activeDrop
                  ? "border-[var(--vx-accent)]/40 bg-[var(--vx-accent-soft)]/20"
                  : "border-[var(--vx-border)] bg-[var(--vx-surface)]/40"
              )}
            >
              <p className="text-xs font-medium text-[var(--vx-text-muted)]">
                Drop deals here
              </p>
              <p className="mt-1 text-[10px] text-[var(--vx-text-muted)] opacity-80">
                Stage is empty
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
                  onQuickCompleteFirstTask={
                    onQuickCompleteFirstTask
                      ? () => void onQuickCompleteFirstTask(id)
                      : undefined
                  }
                  quickCompleting={quickCompletingDealId === id}
                  onQuickAddTask={
                    onQuickAddTask
                      ? (preset, custom) => void onQuickAddTask(id, preset, custom)
                      : undefined
                  }
                  quickAddingTask={quickAddingTaskDealId === id}
                  onInlineSave={
                    onInlineSaveDeal
                      ? (patch) => void onInlineSaveDeal(id, patch)
                      : undefined
                  }
                  inlineSaving={inlineSavingDealId === id}
                  onMoveToFallbackStage={
                    onMoveToFallbackStage
                      ? (preset) => void onMoveToFallbackStage(id, preset)
                      : undefined
                  }
                  movingStage={movingStageDealId === id}
                  onSuggestedAction={
                    onSuggestedAction
                      ? (action) => void onSuggestedAction(id, action)
                      : undefined
                  }
                  suggestedActionLoading={suggestedActionLoadingDealId === id}
                  needsAttention={Boolean(attentionDealIds?.has(id))}
                  onTaskComplete={onTaskComplete}
                  completingTaskId={completingTaskId}
                  notes={notesByDealId?.[id] ?? []}
                  onAddNote={onAddNote ? () => void onAddNote(id) : undefined}
                  addingNote={addingNoteDealId === id}
                />
              );
            })
          )}
        </SortableContext>
      </div>
    </div>
  );
}
