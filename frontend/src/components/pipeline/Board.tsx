"use client";

import {
  DndContext,
  pointerWithin,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { useState } from "react";
import Stage from "./Stage";

export default function Board({
  stages,
  dealsByStage,
}: {
  stages: any[];
  dealsByStage: Record<string, any[]>;
}) {
  const [items, setItems] = useState(dealsByStage);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // ❌ Если нет целевого контейнера - отменяем операцию
    if (!over) return;

    const fromStage = active.data.current?.stageId;
    const fromIndex = active.data.current?.index;

    // ❌ Проверяем корректность исходных данных
    if (!fromStage || fromIndex === undefined) return;

    // 🔥 ИСПРАВЛЕНИЕ: Проверяем оба варианта
    // Если over это карточка, берём stageId из data
    // Если over это сама колонка, берём ID из over.id
    const toStage = over.data?.current?.stageId || String(over.id);

    // ❌ Если нет целевого этапа - отменяем
    if (!toStage) return;

    const toIndex =
      over.data?.current?.index !== undefined
        ? over.data.current.index
        : items[toStage]?.length || 0;

    setItems((prev) => {
      // ❌ Проверяем существование исходного этапа
      if (!prev[fromStage]) return prev;

      const source = [...prev[fromStage]];
      const dest =
        fromStage === toStage ? source : [...(prev[toStage] || [])];

      const [moved] = source.splice(fromIndex, 1);

      if (!moved) return prev; // ❌ Если элемент не найден - отменяем

      dest.splice(toIndex, 0, {
        ...moved,
        stageId: toStage,
      });

      return {
        ...prev,
        [fromStage]: source,
        [toStage]: dest,
      };
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4">
        {stages.map((stage) => (
          <Stage
            key={String(stage.id)}
            stage={stage}
            deals={items[String(stage.id)] || []}
          />
        ))}
      </div>
    </DndContext>
  );
}
