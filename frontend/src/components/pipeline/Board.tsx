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

import { useCallback, useEffect, useMemo, useState } from "react";
import Stage from "./Stage";
import DealModal from "./DealModal";
import ClientModal from "./ClientModal";
import { DealCardContent } from "./DealCard";
import {
  createDeal,
  createClient,
  deleteClient,
  getClients,
  deleteDeal,
  getStaleDeals,
  patchDeal,
  updateDealStage,
} from "@/src/lib/api";
import {
  formatCreatedRelative,
  formatDealIdLabel,
} from "@/src/lib/dealDisplay";
import {
  normalizeDealPayload,
  removeDealFromGrouped,
  upsertDealInGrouped,
} from "@/src/lib/dealGrouping";
import { Client, DealsByStage, Deal, PipelineStage, StaleDeal } from "@/src/types";

interface BoardProps {
  stages: PipelineStage[];
  dealsByStage: DealsByStage;
  setDealsByStage: React.Dispatch<React.SetStateAction<DealsByStage>>;
  companyId: number;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
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

function findDealInBoard(
  grouped: DealsByStage,
  dealId: string
): Deal | undefined {
  for (const list of Object.values(grouped)) {
    if (!Array.isArray(list)) continue;
    const found = list.find((d) => String(d.id) === dealId);
    if (found) return found;
  }
  return undefined;
}

function formatActivityAgo(
  lastActivity: string | null,
  createdAt: string | undefined
): string {
  const ref = lastActivity ?? createdAt;
  if (!ref) return "—";
  const diffMs = Date.now() - new Date(ref).getTime();
  const days = Math.floor(diffMs / (86400 * 1000));
  const hours = Math.floor(diffMs / (3600 * 1000));
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return "< 1 hour ago";
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
  setClients,
}: BoardProps) {
  const [overlayDeal, setOverlayDeal] = useState<Deal | null>(null);
  const [dndLoading, setDndLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [dealInModal, setDealInModal] = useState<Deal | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientSubmitting, setClientSubmitting] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [staleDeals, setStaleDeals] = useState<StaleDeal[]>([]);

  const boardBusy =
    modalSubmitting ||
    clientSubmitting ||
    deletingDealId !== null ||
    deletingClientId !== null;

  const staleById = useMemo(() => {
    const m = new Map<string, StaleDeal>();
    for (const s of staleDeals) {
      m.set(String(s.id), s);
    }
    return m;
  }, [staleDeals]);

  useEffect(() => {
    const run = async () => {
      try {
        const list = await getStaleDeals(companyId);
        setStaleDeals(list);
      } catch {
        setStaleDeals([]);
      }
    };
    void run();
  }, [companyId, modalOpen]);

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
        const msg =
          err instanceof Error ? err.message : "Ошибка при перемещении сделки";
        if (typeof window !== "undefined") {
          window.alert(msg);
        }
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

  const openClientCreate = useCallback(() => {
    setClientError(null);
    setClientModalOpen(true);
  }, []);

  const closeClientModal = useCallback(() => {
    if (clientSubmitting) return;
    setClientModalOpen(false);
    setClientError(null);
  }, [clientSubmitting]);

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
      if (typeof window !== "undefined" && !window.confirm("Are you sure?")) {
        return;
      }

      const snapshot = deal;
      setDeletingDealId(String(deal.id));
      setDealsByStage((prev) => removeDealFromGrouped(prev, String(deal.id)));

      const closeIfModal =
        dealInModal && String(dealInModal.id) === String(deal.id);
      if (closeIfModal) {
        setModalOpen(false);
        setDealInModal(null);
      }

      try {
        await deleteDeal(companyId, deal.id);
        if (typeof window !== "undefined") {
          window.alert("Deal deleted");
        }
      } catch (err) {
        setDealsByStage((prev) => upsertDealInGrouped(prev, snapshot));
        const msg =
          err instanceof Error ? err.message : "Не удалось удалить сделку";
        if (typeof window !== "undefined") {
          window.alert(msg);
        }
      } finally {
        setDeletingDealId(null);
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
        if (typeof window !== "undefined") {
          window.alert("Deal created");
        }
      } catch (err) {
        setDealsByStage((prev) => removeDealFromGrouped(prev, tempId));
        const msg =
          err instanceof Error ? err.message : "Не удалось создать сделку";
        if (typeof window !== "undefined") {
          window.alert(msg);
        }
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
        if (typeof window !== "undefined") {
          window.alert("Deal updated");
        }
      } catch (err) {
        setDealsByStage((prev) => upsertDealInGrouped(prev, prevSnapshot));
        const msg =
          err instanceof Error ? err.message : "Не удалось сохранить сделку";
        if (typeof window !== "undefined") {
          window.alert(msg);
        }
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

  const handleDeleteClient = useCallback(
    async (client: Client) => {
      if (typeof window !== "undefined" && !window.confirm("Are you sure?")) {
        return;
      }
      setDeletingClientId(String(client.id));
      try {
        await deleteClient(companyId, client.id);
        const refreshed = await getClients(companyId);
        setClients(refreshed);
        if (typeof window !== "undefined") {
          window.alert("Client deleted");
        }
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : "Не удалось удалить клиента"
        );
      } finally {
        setDeletingClientId(null);
      }
    },
    [companyId, setClients]
  );

  const handleCreateClient = useCallback(
    async (values: { name: string; email: string }) => {
      setClientSubmitting(true);
      setClientError(null);
      try {
        await createClient(companyId, {
          name: values.name,
          email: values.email || undefined,
        });
        const refreshed = await getClients(companyId);
        setClients(refreshed);
        setClientModalOpen(false);
        if (typeof window !== "undefined") {
          window.alert("Client created");
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Не удалось создать клиента";
        if (typeof window !== "undefined") {
          window.alert(msg);
        }
      } finally {
        setClientSubmitting(false);
      }
    },
    [companyId, setClients]
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreate}
            disabled={boardBusy}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-50"
          >
            Add Deal
          </button>
          <button
            type="button"
            onClick={openClientCreate}
            disabled={boardBusy}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Add Client
          </button>
        </div>
      </div>

      <div className="mb-4 rounded border border-gray-200 bg-white px-3 py-2 text-sm">
        <p className="mb-2 font-medium text-gray-800">Клиенты</p>
        {clients.length === 0 ? (
          <p className="text-gray-500">No clients yet</p>
        ) : (
          <ul className="space-y-1">
            {clients.map((c) => (
              <li
                key={String(c.id)}
                className="flex items-center justify-between gap-2 border-b border-gray-100 py-1 last:border-0"
              >
                <span className="text-gray-700">
                  {c.name}
                  {c.email ? ` (${String(c.email)})` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => void handleDeleteClient(c)}
                  disabled={deletingClientId !== null}
                  className="shrink-0 text-red-600 hover:underline disabled:opacity-50"
                >
                  {deletingClientId === String(c.id)
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {staleDeals.length > 0 ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p className="font-semibold">
            ⚠️ Follow up needed ({staleDeals.length})
          </p>
          <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
            {staleDeals.map((s) => (
              <li
                key={s.id}
                className="rounded border border-amber-200 bg-white px-2 py-1.5"
              >
                <button
                  type="button"
                  disabled={boardBusy}
                  onClick={() => {
                    const d = findDealInBoard(dealsByStage, s.id);
                    if (d) openEdit(d);
                  }}
                  className="w-full text-left hover:underline disabled:opacity-50"
                >
                  <span className="font-medium text-gray-900">
                    {s.title}{" "}
                    <span className="font-normal text-gray-500">
                      ({formatDealIdLabel(s.id)})
                    </span>
                  </span>
                  {s.client_name ? (
                    <span className="block text-xs text-gray-600">
                      Client: {s.client_name}
                    </span>
                  ) : null}
                  <span className="mt-0.5 block text-xs text-gray-500">
                    Created: {formatCreatedRelative(s.created_at)}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    Last activity:{" "}
                    {s.last_activity
                      ? new Date(s.last_activity).toLocaleString()
                      : "Never"}
                    {" · "}
                    {formatActivityAgo(s.last_activity, s.created_at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
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
              clients={clients}
              isLoading={dndLoading}
              deletingDealId={deletingDealId}
              dragDisabled={Boolean(deletingDealId || dndLoading)}
              onDealOpen={openEdit}
              onDealDelete={(d) => void handleDelete(d)}
            />
          ))}
        </div>
        <DragOverlay>
          {overlayDeal ? (
            <div className="w-60 cursor-grabbing rounded bg-white p-3 opacity-95 shadow-xl ring-2 ring-blue-300">
              <DealCardContent deal={overlayDeal} clients={clients} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {modalOpen ? (
        <DealModal
          mode={modalMode}
          deal={dealInModal}
          companyId={companyId}
          stages={stages}
          clients={clients}
          submitting={modalSubmitting}
          deletingDeal={
            dealInModal != null &&
            deletingDealId === String(dealInModal.id)
          }
          error={modalError}
          onClose={closeModal}
          onCreate={(v) => void handleModalCreate(v)}
          onEdit={(v) => void handleModalEdit(v)}
          onDelete={
            modalMode === "edit" ? () => void handleModalDelete() : undefined
          }
          onCreateClient={openClientCreate}
          staleRow={
            dealInModal && modalMode === "edit"
              ? staleById.get(String(dealInModal.id)) ?? null
              : null
          }
        />
      ) : null}

      <ClientModal
        open={clientModalOpen}
        submitting={clientSubmitting}
        error={clientError}
        onClose={closeClientModal}
        onSubmit={(values) => void handleCreateClient(values)}
      />
    </>
  );
}
