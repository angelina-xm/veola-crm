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

const STAGE_ACCENTS = [
  "bg-sky-400/80",
  "bg-violet-400/80",
  "bg-amber-400/80",
  "bg-emerald-400/80",
  "bg-rose-400/80",
  "bg-indigo-400/80",
];

function stageAccentClass(stageId: string, stageIndex: number): string {
  const n =
    stageId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + stageIndex;
  return STAGE_ACCENTS[n % STAGE_ACCENTS.length];
}

export default function Stage({
  stage,
  stageIndex = 0,
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
  closingSoonDealIds,
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
  onAddDealInStage,
}: {
  stage: PipelineStage;
  stageIndex?: number;
  deals: Deal[];
  clients?: Client[];
  openTasksByDealId?: Record<string, Activity[]>;
  highlightDealIds?: Set<string>;
  filterDimActive?: boolean;
  closingSoonDealIds?: Set<string>;
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
  onAddDealInStage?: (stageId: string) => void;
  isLoading?: boolean;
  deletingDealId: string | null;
  dragDisabled?: boolean;
  onDealOpen: (deal: Deal) => void;
  onDealDelete: (deal: Deal) => void;
}) {
  const safeDeals = Array.isArray(deals) ? deals : [];
  const totalValue = sumDealAmounts(safeDeals);
  const accent = stageAccentClass(String(stage.id), stageIndex);

  const { setNodeRef, isOver: dropOver } = useDroppable({
    id: `stage-${String(stage.id)}`,
    data: { stageId: String(stage.id) },
  });

  const activeDrop = isOver || dropOver;

  return (
    <div
      className={cn(
        "vx-deals-column flex flex-col overflow-hidden rounded-2xl transition-all duration-300 ease-out",
        "border border-[var(--vx-border-subtle)] bg-[var(--vx-column-bg)]",
        activeDrop && "vx-deals-column--active",
        isLoading && "opacity-60"
      )}
    >
      <header className="relative border-b border-[var(--vx-border-subtle)] px-4 pb-3 pt-3.5">
        <span
          className={cn("absolute inset-x-4 top-0 h-px rounded-full opacity-60", accent)}
          aria-hidden
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", accent)} aria-hidden />
            <h2 className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--vx-text-secondary)]">
              {stage.name}
            </h2>
          </div>
          <span className="shrink-0 rounded-md bg-[var(--vx-bg-subtle)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--vx-text-muted)] vx-tabular">
            {safeDeals.length}
          </span>
        </div>
        <p className="mt-1.5 pl-3.5 text-[12px] font-medium text-[var(--vx-text)] vx-tabular">
          {formatDealAmountUsd(totalValue) ?? "$0"}
        </p>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "vx-deals-column-body min-h-[16rem] flex-1 px-2.5 py-2.5 transition-colors duration-300",
          activeDrop && "bg-[var(--vx-accent-soft)]/[0.06]"
        )}
      >
        <SortableContext
          items={safeDeals.map((d) => `deal-${String(d.id)}`)}
          strategy={verticalListSortingStrategy}
        >
          {safeDeals.length === 0 ? (
            <div
              className={cn(
                "flex min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed px-4 py-10 text-center transition-all duration-300",
                activeDrop
                  ? "border-[var(--vx-accent)]/30 bg-[var(--vx-accent-soft)]/10 scale-[1.01]"
                  : "border-[var(--vx-border)]/80 bg-[var(--vx-card-bg)]/20"
              )}
            >
              <p className="text-[12px] font-medium text-[var(--vx-text-muted)]">
                {activeDrop ? "Release to drop" : "Drop deals here"}
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
                  closingSoon={Boolean(closingSoonDealIds?.has(id))}
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

        {onAddDealInStage ? (
          <button
            type="button"
            className="vx-deals-add-deal mt-1 w-full"
            onClick={() => onAddDealInStage(String(stage.id))}
          >
            <span aria-hidden>+</span>
            Add deal
          </button>
        ) : null}
      </div>
    </div>
  );
}
