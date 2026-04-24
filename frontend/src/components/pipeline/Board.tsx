"use client";

import {
  DndContext,
  DragOverlay,
  closestCorners,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { useState, useCallback } from "react";
import Stage from "./Stage";
import { DealCardContent } from "./DealCard";
import { updateDealStage } from "@/src/lib/api";
import { DealsByStage, Deal, PipelineStage } from "@/src/types";

interface BoardProps {
  stages: PipelineStage[];
  dealsByStage: DealsByStage;
  companyId: number;
}

type DragMutation = {
  previous: DealsByStage;
  movedDealId: string;
  targetStageId: string;
};

function parseDealId(dndId: string) {
  return dndId.startsWith("deal-") ? dndId.slice("deal-".length) : dndId;
}

function parseStageId(dndId: string) {
  return dndId.startsWith("stage-") ? dndId.slice("stage-".length) : dndId;
}

export default function Board({
  stages,
  dealsByStage,
  companyId,
}: BoardProps) {
  const [items, setItems] = useState<DealsByStage>(dealsByStage);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const findStageIdByDealId = useCallback(
    (source: DealsByStage, dealId: string) =>
      Object.keys(source).find((stageId) =>
        source[stageId]?.some((deal) => String(deal.id) === dealId)
      ),
    []
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over) return;
      const activeDealId = parseDealId(String(active.id));
      const overRawId = String(over.id);

      let mutationResult: DragMutation | null = null;

      // Optimistic UI update based on actual ids instead of stale drag metadata.
      setItems((prev) => {
        const fromStageId = findStageIdByDealId(prev, activeDealId);
        if (!fromStageId) return prev;

        const toStageId = overRawId.startsWith("stage-")
          ? parseStageId(overRawId)
          : findStageIdByDealId(prev, parseDealId(overRawId));
        if (!toStageId) return prev;

        const sourceDeals = [...(prev[fromStageId] || [])];
        const targetDeals =
          fromStageId === toStageId ? sourceDeals : [...(prev[toStageId] || [])];

        const activeIndex = sourceDeals.findIndex(
          (deal) => String(deal.id) === activeDealId
        );
        if (activeIndex === -1) return prev;

        const [movedDeal] = sourceDeals.splice(activeIndex, 1);
        if (!movedDeal) return prev;

        let targetIndex = targetDeals.findIndex(
          (deal) => String(deal.id) === parseDealId(overRawId)
        );
        if (targetIndex === -1) {
          targetIndex = targetDeals.length;
        }

        if (fromStageId === toStageId && activeIndex < targetIndex) {
          targetIndex -= 1;
        }

        targetDeals.splice(targetIndex, 0, {
          ...movedDeal,
          stageId: toStageId,
          stage: toStageId,
        });

        mutationResult = {
          previous: prev,
          movedDealId: activeDealId,
          targetStageId: toStageId,
        };

        return {
          ...prev,
          [fromStageId]: sourceDeals,
          [toStageId]: targetDeals,
        };
      });

      if (!mutationResult) return;

      const { previous, movedDealId, targetStageId } = mutationResult;

      // 🌐 Отправляем обновление на backend
      setLoading(true);
      setError(null);

      try {
        const updatedDeal = await updateDealStage(
          companyId,
          movedDealId,
          targetStageId
        );

        // Reconcile local deal fields with backend response.
        setItems((prev) => {
          const next: DealsByStage = {};
          const resolvedStageId = String(updatedDeal?.stage ?? targetStageId);
          for (const [stageId, deals] of Object.entries(prev)) {
            next[stageId] = deals.map((deal) =>
              String(deal.id) === movedDealId
                ? {
                    ...deal,
                    ...updatedDeal,
                    stage: resolvedStageId,
                    stageId: resolvedStageId,
                  }
                : deal
            );
          }
          return next;
        });
      } catch (err) {
        // ❌ Откатываем при ошибке
        setItems(previous);
        setError(
          err instanceof Error ? err.message : "Ошибка при перемещении сделки"
        );
        console.error("Drag & drop error:", err);
      } finally {
        setLoading(false);
      }
    },
    [companyId, findStageIdByDealId]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const activeDealId = parseDealId(String(event.active.id));
    for (const deals of Object.values(items)) {
      const deal = deals.find((d) => String(d.id) === activeDealId);
      if (deal) {
        setActiveDeal(deal);
        return;
      }
    }
    setActiveDeal(null);
  }, [items]);

  const handleDragCancel = useCallback(() => {
    setActiveDeal(null);
  }, []);

  const handleDragEndWithCleanup = useCallback(
    async (event: DragEndEvent) => {
      try {
        await handleDragEnd(event);
      } finally {
        setActiveDeal(null);
      }
    },
    [handleDragEnd]
  );

  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEndWithCleanup}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <Stage
              key={String(stage.id)}
              stage={stage}
              deals={items[String(stage.id)] || []}
              isLoading={loading}
            />
          ))}
        </div>
        <DragOverlay>
          {activeDeal ? (
            <div className="bg-white p-3 rounded shadow-xl ring-2 ring-blue-300 cursor-grabbing opacity-95 w-60">
              <DealCardContent deal={activeDeal} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
