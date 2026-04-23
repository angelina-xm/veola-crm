"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import DealCard from "./DealCard";

export default function Stage({
  stage,
  deals,
}: {
  stage: any;
  deals: any[];
}) {
  // ✅ защита от "deals не массив"
  const safeDeals = Array.isArray(deals) ? deals : [];

  const { setNodeRef } = useDroppable({
    id: String(stage.id),
    data: {
      stageId: String(stage.id),
    },
  });

  return (
    <div
      ref={setNodeRef}
      className="w-64 bg-gray-100 p-3 rounded min-h-[200px]"
    >
      <h2 className="mb-2 font-bold">{stage.name}</h2>

      <SortableContext
        items={safeDeals.map((d) => String(d.id))}
        strategy={verticalListSortingStrategy}
      >
        {safeDeals.map((deal, index) => (
          <DealCard
            key={deal.id}
            deal={deal}
            index={index}
            stageId={String(stage.id)}
          />
        ))}
      </SortableContext>
    </div>
  );
}