"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import DealCard from "./DealCard";
import type { TaskPreset } from "@/src/lib/quickTask";
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
      <h2 className="mb-2 font-bold">{stage.name}</h2>

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
          />
          );
        })}
      </SortableContext>
    </div>
  );
}