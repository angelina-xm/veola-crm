"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import DealCard from "./DealCard";
import { Client, Deal, PipelineStage } from "@/src/types";

export default function Stage({
  stage,
  deals,
  clients = [],
  isLoading = false,
  deletingDealId,
  dragDisabled = false,
  onDealOpen,
  onDealDelete,
}: {
  stage: PipelineStage;
  deals: Deal[];
  clients?: Client[];
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
        {safeDeals.map((deal, index) => (
          <DealCard
            key={deal.id}
            deal={deal}
            index={index}
            stageId={String(stage.id)}
            clients={clients}
            isDeleting={deletingDealId === String(deal.id)}
            deleteDisabled={deletingDealId !== null}
            dragDisabled={dragDisabled}
            onOpen={onDealOpen}
            onDelete={onDealDelete}
          />
        ))}
      </SortableContext>
    </div>
  );
}