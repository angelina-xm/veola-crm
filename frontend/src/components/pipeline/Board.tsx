"use client";

import {
  DndContext,
  pointerWithin,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { useState, useCallback } from "react";
import Stage from "./Stage";
import { updateDealStage } from "@/lib/api";
import { DealsByStage, Deal } from "@/types";

interface BoardProps {
  stages: any[];
  dealsByStage: DealsByStage;
  token: string;
  companyId: number;
}

export default function Board({
  stages,
  dealsByStage,
  token,
  companyId,
}: BoardProps) {
  const [items, setItems] = useState<DealsByStage>(dealsByStage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over) return;

      const fromStage = active.data.current?.stageId;
      const fromIndex = active.data.current?.index;

      if (!fromStage || fromIndex === undefined) return;

      // 🔥 Определяем целевую колонку
      const toStage = over.data?.current?.stageId || String(over.id);

      if (!toStage) return;

      // Не перемещаем если drop на той же позиции
      if (fromStage === toStage && fromIndex === (over.data?.current?.index ?? items[toStage]?.length || 0)) {
        return;
      }

      const toIndex =
        over.data?.current?.index !== undefined
          ? over.data.current.index
          : items[toStage]?.length || 0;

      // 🎯 Оптимистичное обновление UI
      const previousItems = items;
      
      setItems((prev) => {
        if (!prev[fromStage]) return prev;

        const source = [...prev[fromStage]];
        const dest =
          fromStage === toStage ? source : [...(prev[toStage] || [])];

        const [moved] = source.splice(fromIndex, 1);

        if (!moved) return prev;

        dest.splice(toIndex, 0, {
          ...moved,
          stageId: toStage,
          stage: toStage,
        });

        return {
          ...prev,
          [fromStage]: source,
          [toStage]: dest,
        };
      });

      // 🌐 Отправляем обновление на backend
      setLoading(true);
      setError(null);

      try {
        const deal = previousItems[fromStage]?.[fromIndex];
        if (deal) {
          await updateDealStage(token, companyId, deal.id, toStage, toIndex);
        }
      } catch (err) {
        // ❌ Откатываем при ошибке
        setItems(previousItems);
        setError(
          err instanceof Error ? err.message : "Ошибка при перемещении сделки"
        );
        console.error("Drag & drop error:", err);
      } finally {
        setLoading(false);
      }
    },
    [items, token, companyId]
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
        collisionDetection={pointerWithin}
        onDragEnd={handleDragEnd}
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
      </DndContext>
    </>
  );
}
