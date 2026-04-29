"use client";

import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  type CollisionDetection,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { useCallback, useState } from "react";
import Stage from "./Stage";
import DealModal from "./DealModal";
import { DealCardContent } from "./DealCard";
import {
  createDeal,
  deleteDeal,
  patchDeal,
  updateDealStage,
} from "@/src/lib/api";
import {
  normalizeDealPayload,
  removeDealFromGrouped,
  upsertDealInGrouped,
} from "@/src/lib/dealGrouping";
import { Client, DealsByStage, Deal, PipelineStage } from "@/src/types";

interface BoardProps {
  stages: PipelineStage[];
  dealsByStage: DealsByStage;
  setDealsByStage: React.Dispatch<React.SetStateAction<DealsByStage>>;
  companyId: number;
  clients: Client[];
}

type DragMutation = {
  movedDealId: string;
  movedDealSnapshot: Deal;
  fromStageId: string;
  targetStageId: string;
  fromIndex: number;
};

function parseDealId(dndId: string) {
  return dndId.startsWith("deal-") ? dndId.slice("deal-".length) : dndId;
}

function parseStageId(dndId: string) {
  return dndId.startsWith("stage-") ? dndId.slice("stage-".length) : dndId;
}

/** Сначала пробуем pointerWithin (лучше для колонок/пустых зон), затем closestCorners. */
const boardCollisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  if (pointer.length > 0) {
    return pointer;
  }
  return closestCorners(args);
};

function computeNextBoardAfterDrag(
  prev: DealsByStage,
  activeDealId: string,
  overRawId: string,
  findStageIdByDealId: (
    source: DealsByStage,
    dealId: string
  ) => string | undefined
): { next: DealsByStage; mutation: DragMutation } | null {
  const fromStageId = findStageIdByDealId(prev, activeDealId);
  if (!fromStageId) return null;

  const toStageId = overRawId.startsWith("stage-")
    ? parseStageId(overRawId)
    : findStageIdByDealId(prev, parseDealId(overRawId));
  if (!toStageId) return null;

  const sourceDeals = [...(prev[fromStageId] || [])];
  const targetDeals =
    fromStageId === toStageId ? sourceDeals : [...(prev[toStageId] || [])];

  const activeIndex = sourceDeals.findIndex(
    (deal) => String(deal.id) === activeDealId
  );
  if (activeIndex === -1) return null;

  const [movedDeal] = sourceDeals.splice(activeIndex, 1);
  if (!movedDeal) return null;

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

  return {
    next: {
      ...prev,
      [fromStageId]: sourceDeals,
      [toStageId]: targetDeals,
    },
    mutation: {
      movedDealId: activeDealId,
      movedDealSnapshot: {
        ...movedDeal,
        stage: fromStageId,
        stageId: fromStageId,
      },
      fromStageId,
      targetStageId: toStageId,
      fromIndex: activeIndex,
    },
  };
}

function rollbackSingleMovedDeal(
  prev: DealsByStage,
  mutation: DragMutation
): DealsByStage {
  const { movedDealId, movedDealSnapshot, fromStageId, fromIndex } = mutation;
  const next: DealsByStage = {};

  for (const [stageId, deals] of Object.entries(prev)) {
    next[stageId] = deals.filter((deal) => String(deal.id) !== movedDealId);
  }

  const source = [...(next[fromStageId] || [])];
  const insertAt = Math.max(0, Math.min(fromIndex, source.length));
  source.splice(insertAt, 0, {
    ...movedDealSnapshot,
    stage: fromStageId,
    stageId: fromStageId,
  });
  next[fromStageId] = source;

  return next;
}

function readDealPatch(raw: unknown): Deal {
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("id" in raw) ||
    !("title" in raw)
  ) {
    throw new Error("Invalid deal response");
  }
  const o = raw as {
    id: string | number;
    title: string;
    stage?: string | number | null;
    amount?: string | number;
    client?: string | number | null;
    created_at?: string;
  };
  return normalizeDealPayload(o);
}

export default function Board({
  stages,
  dealsByStage,
  setDealsByStage,
  companyId,
  clients,
}: BoardProps) {
  const [overlayDeal, setOverlayDeal] = useState<Deal | null>(null);
  const [dndLoading, setDndLoading] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [dealInModal, setDealInModal] = useState<Deal | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      /** Порог только для элементов с activator listeners (ручка карточки). */
      activationConstraint: { distance: 6 },
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
      if (dndLoading) return;
      const { active, over } = event;

      if (!over) return;
      const activeDealId = parseDealId(String(active.id));
      const overRawId = String(over.id);

      const computed = computeNextBoardAfterDrag(
        dealsByStage,
        activeDealId,
        overRawId,
        findStageIdByDealId
      );
      if (!computed) return;

      const { next, mutation } = computed;
      setDealsByStage(next);

      const { movedDealId, targetStageId } = mutation;

      setDndLoading(true);
      setBannerError(null);

      try {
        const raw = await updateDealStage(
          companyId,
          movedDealId,
          targetStageId
        );
        const updatedDeal = readDealPatch(raw);

        setDealsByStage((prev) => {
          const next: DealsByStage = {};
          const resolvedStageId = String(updatedDeal.stage ?? targetStageId);
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
        setDealsByStage((prev) => rollbackSingleMovedDeal(prev, mutation));
        setBannerError(
          err instanceof Error ? err.message : "Ошибка при перемещении сделки"
        );
        console.error("Drag & drop error:", err);
      } finally {
        setDndLoading(false);
      }
    },
    [companyId, dealsByStage, dndLoading, findStageIdByDealId, setDealsByStage]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (dndLoading) {
        setOverlayDeal(null);
        return;
      }
      const activeDealId = parseDealId(String(event.active.id));
      for (const deals of Object.values(dealsByStage)) {
        const deal = deals.find((d) => String(d.id) === activeDealId);
        if (deal) {
          setOverlayDeal(deal);
          return;
        }
      }
      setOverlayDeal(null);
    },
    [dealsByStage, dndLoading]
  );

  const handleDragCancel = useCallback(() => {
    setOverlayDeal(null);
  }, []);

  const handleDragEndWithCleanup = useCallback(
    async (event: DragEndEvent) => {
      try {
        await handleDragEnd(event);
      } finally {
        setOverlayDeal(null);
      }
    },
    [handleDragEnd]
  );

  const openCreate = useCallback(() => {
    setModalMode("create");
    setDealInModal(null);
    setModalError(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((deal: Deal) => {
    setModalMode("edit");
    setDealInModal(deal);
    setModalError(null);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (modalSubmitting) return;
    setModalOpen(false);
    setDealInModal(null);
    setModalError(null);
  }, [modalSubmitting]);

  const handleDelete = useCallback(
    async (deal: Deal) => {
      if (typeof window !== "undefined" && !window.confirm("Удалить эту сделку?"))
        return;

      const snapshot = deal;
      setBannerError(null);
      setDealsByStage((prev) => removeDealFromGrouped(prev, String(deal.id)));

      const closeIfModal =
        dealInModal && String(dealInModal.id) === String(deal.id);
      if (closeIfModal) {
        setModalOpen(false);
        setDealInModal(null);
      }

      try {
        await deleteDeal(companyId, deal.id);
      } catch (err) {
        setDealsByStage((prev) => upsertDealInGrouped(prev, snapshot));
        setBannerError(
          err instanceof Error ? err.message : "Не удалось удалить сделку"
        );
      }
    },
    [companyId, dealInModal, setDealsByStage]
  );

  const handleModalCreate = useCallback(
    async (values: {
      title: string;
      amount: number;
      stageId: string;
      clientId: string;
    }) => {
      setModalError(null);
      setModalSubmitting(true);

      const tempId = `temp-${Date.now()}`;
      const optimistic: Deal = {
        id: tempId,
        title: values.title,
        amount: values.amount,
        stage: values.stageId,
        stageId: values.stageId,
        client: values.clientId,
      };

      setDealsByStage((prev) => upsertDealInGrouped(prev, optimistic));

      try {
        const raw = await createDeal(companyId, {
          title: values.title,
          amount: values.amount,
          stage: Number.parseInt(values.stageId, 10),
          client: Number.parseInt(values.clientId, 10),
        });
        const normalized = readDealPatch(raw);

        setDealsByStage((prev) => {
          const cleared = removeDealFromGrouped(prev, tempId);
          return upsertDealInGrouped(cleared, normalized);
        });
        setModalOpen(false);
      } catch (err) {
        setDealsByStage((prev) => removeDealFromGrouped(prev, tempId));
        setModalError(
          err instanceof Error ? err.message : "Не удалось создать сделку"
        );
      } finally {
        setModalSubmitting(false);
      }
    },
    [companyId, setDealsByStage]
  );

  const handleModalEdit = useCallback(
    async (values: {
      title: string;
      amount: number;
      stageId: string;
    }) => {
      if (!dealInModal) return;

      setModalError(null);
      setModalSubmitting(true);

      const id = String(dealInModal.id);
      const prevSnapshot = dealInModal;

      const optimistic: Deal = {
        ...dealInModal,
        title: values.title,
        amount: values.amount,
        stage: values.stageId,
        stageId: values.stageId,
      };

      setDealsByStage((prev) => upsertDealInGrouped(prev, optimistic));

      try {
        const raw = await patchDeal(companyId, id, {
          title: values.title,
          amount: values.amount,
          stage: Number.parseInt(values.stageId, 10),
        });
        const normalized = readDealPatch(raw);

        setDealsByStage((prev) => upsertDealInGrouped(prev, normalized));
        setModalOpen(false);
        setDealInModal(null);
      } catch (err) {
        setDealsByStage((prev) => upsertDealInGrouped(prev, prevSnapshot));
        setModalError(
          err instanceof Error ? err.message : "Не удалось сохранить сделку"
        );
      } finally {
        setModalSubmitting(false);
      }
    },
    [companyId, dealInModal, setDealsByStage]
  );

  const handleModalDelete = useCallback(async () => {
    if (!dealInModal) return;
    await handleDelete(dealInModal);
  }, [dealInModal, handleDelete]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
        >
          Add Deal
        </button>
      </div>

      {bannerError ? (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {bannerError}
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={boardCollisionDetection}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEndWithCleanup}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <Stage
              key={String(stage.id)}
              stage={stage}
              deals={dealsByStage[String(stage.id)] || []}
              isLoading={dndLoading}
              onDealOpen={openEdit}
              onDealDelete={(d) => void handleDelete(d)}
            />
          ))}
        </div>
        <DragOverlay>
          {overlayDeal ? (
            <div className="w-60 cursor-grabbing rounded bg-white p-3 opacity-95 shadow-xl ring-2 ring-blue-300">
              <DealCardContent deal={overlayDeal} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {modalOpen ? (
        <DealModal
          mode={modalMode}
          deal={dealInModal}
          stages={stages}
          clients={clients}
          submitting={modalSubmitting}
          error={modalError}
          onClose={closeModal}
          onCreate={(v) => void handleModalCreate(v)}
          onEdit={(v) => void handleModalEdit(v)}
          onDelete={
            modalMode === "edit" ? () => void handleModalDelete() : undefined
          }
        />
      ) : null}
    </>
  );
}
