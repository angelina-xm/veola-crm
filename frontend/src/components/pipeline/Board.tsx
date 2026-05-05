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
import NotificationBar from "@/src/components/notifications/NotificationBar";
import {
  DealCardContent,
  type StageFallbackPreset,
  type SuggestedAction,
} from "./DealCard";
import {
  createActivity,
  createDeal,
  createClient,
  deleteClient,
  getClients,
  deleteDeal,
  getCompanyOpenTasks,
  getStaleDeals,
  patchActivity,
  patchDeal,
  updateDealStage,
  type NotificationItem,
} from "@/src/lib/api";
import {
  formatCreatedRelative,
  formatDealAmountUsd,
  formatDealIdLabel,
} from "@/src/lib/dealDisplay";
import { groupOpenTasksByDealId } from "@/src/lib/dealTaskSignal";
import { createTaskFromPreset, type TaskPreset } from "@/src/lib/quickTask";
import { computeHighlightedDealIds } from "@/src/lib/notificationDealHighlight";
import { useNotifications } from "@/src/hooks/useNotifications";
import { getStoredCompanyId } from "@/src/lib/auth";
import {
  normalizeDealPayload,
  removeDealFromGrouped,
  upsertDealInGrouped,
} from "@/src/lib/dealGrouping";
import {
  Activity,
  Client,
  DealsByStage,
  Deal,
  PipelineStage,
  StaleDeal,
} from "@/src/types";

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

const STALE_MS =
  process.env.NEXT_PUBLIC_DEV_FAST === "true"
    ? 60 * 1000
    : 48 * 60 * 60 * 1000;

function isDealStale(lastActivityAt: string | null | undefined): boolean {
  if (!lastActivityAt) return false;
  const ts = new Date(lastActivityAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts > STALE_MS;
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
  const [openCompanyTasks, setOpenCompanyTasks] = useState<Activity[]>([]);

  const openTasksByDealId = useMemo(() => {
    const m = groupOpenTasksByDealId(openCompanyTasks);
    const rec: Record<string, Activity[]> = {};
    m.forEach((list, dealId) => {
      rec[dealId] = list;
    });
    return rec;
  }, [openCompanyTasks]);

  const {
    items: notificationItems,
    totalBadge: notificationTotal,
    refresh: refreshNotifications,
  } = useNotifications(companyId, true);

  const refreshOpenTasksAndNotifications = useCallback(async () => {
    try {
      const tasks = await getCompanyOpenTasks(companyId);
      setOpenCompanyTasks(tasks);
    } catch {
      setOpenCompanyTasks([]);
    }
    await refreshNotifications();
  }, [companyId, refreshNotifications]);

  const [quickCompletingDealId, setQuickCompletingDealId] = useState<
    string | null
  >(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [quickAddingTaskDealId, setQuickAddingTaskDealId] = useState<
    string | null
  >(null);
  const [suggestedActionDealId, setSuggestedActionDealId] = useState<
    string | null
  >(null);
  const [inlineSavingDealId, setInlineSavingDealId] = useState<string | null>(
    null
  );
  const [movingStageDealId, setMovingStageDealId] = useState<string | null>(
    null
  );

  const patchDealInline = useCallback(
    async (dealId: string, patch: { title?: string; amount?: number }) => {
      const current = findDealInBoard(dealsByStage, dealId);
      if (!current) return;
      const optimistic: Deal = {
        ...current,
        title: patch.title ?? current.title,
        amount: patch.amount ?? current.amount,
      };
      setInlineSavingDealId(dealId);
      setDealsByStage((prev) => upsertDealInGrouped(prev, optimistic));
      try {
        const raw = await patchDeal(companyId, dealId, patch);
        const normalized = readDealPatch(raw);
        setDealsByStage((prev) =>
          upsertDealInGrouped(prev, {
            ...optimistic,
            ...normalized,
          })
        );
      } catch (err) {
        setDealsByStage((prev) => upsertDealInGrouped(prev, current));
        if (typeof window !== "undefined") {
          window.alert(
            err instanceof Error ? err.message : "Не удалось сохранить изменения"
          );
        }
      } finally {
        setInlineSavingDealId(null);
      }
    },
    [companyId, dealsByStage, setDealsByStage]
  );

  const moveDealToFallbackStage = useCallback(
    async (dealId: string, preset: StageFallbackPreset) => {
      const targetName =
        preset === "new"
          ? "new"
          : preset === "negotiation"
            ? "negotiation"
            : "won";
      const targetStage = stages.find(
        (s) => String(s.name).trim().toLowerCase() === targetName
      );
      if (!targetStage) {
        if (typeof window !== "undefined") {
          window.alert(
            `Стадия "${targetName}" не найдена в текущей компании.`
          );
        }
        return;
      }
      const current = findDealInBoard(dealsByStage, dealId);
      if (!current) return;
      const optimistic: Deal = {
        ...current,
        stage: String(targetStage.id),
        stageId: String(targetStage.id),
      };
      setMovingStageDealId(dealId);
      setDealsByStage((prev) => upsertDealInGrouped(prev, optimistic));
      try {
        const raw = await patchDeal(companyId, dealId, {
          stage: Number.parseInt(String(targetStage.id), 10),
        });
        const normalized = readDealPatch(raw);
        setDealsByStage((prev) =>
          upsertDealInGrouped(prev, {
            ...optimistic,
            ...normalized,
          })
        );
      } catch (err) {
        setDealsByStage((prev) => upsertDealInGrouped(prev, current));
        if (typeof window !== "undefined") {
          window.alert(
            err instanceof Error ? err.message : "Не удалось сменить стадию"
          );
        }
      } finally {
        setMovingStageDealId(null);
      }
    },
    [companyId, dealsByStage, setDealsByStage, stages]
  );

  const handleQuickAddTask = useCallback(
    async (
      dealId: string,
      preset: TaskPreset,
      customContent?: string
    ) => {
      setQuickAddingTaskDealId(dealId);
      try {
        await createTaskFromPreset(companyId, dealId, preset, customContent);
        await refreshOpenTasksAndNotifications();
      } catch (err) {
        if (typeof window !== "undefined") {
          window.alert(
            err instanceof Error ? err.message : "Не удалось создать задачу"
          );
        }
      } finally {
        setQuickAddingTaskDealId(null);
      }
    },
    [companyId, refreshOpenTasksAndNotifications]
  );

  const handleSuggestedAction = useCallback(
    async (dealId: string, action: SuggestedAction) => {
      setSuggestedActionDealId(dealId);
      try {
        const dealNum = Number.parseInt(dealId, 10);
        if (!Number.isFinite(dealNum)) {
          throw new Error("Некорректный id сделки");
        }
        const tenantId = getStoredCompanyId() ?? companyId;
        const due = new Date();
        due.setDate(due.getDate() + 1);
        due.setHours(12, 0, 0, 0);
        await createActivity(tenantId, {
          deal: dealNum,
          type: "task",
          content: action,
          due_date: due.toISOString(),
        });
        await refreshOpenTasksAndNotifications();
      } catch (err) {
        if (typeof window !== "undefined") {
          window.alert(
            err instanceof Error ? err.message : "Не удалось создать задачу"
          );
        }
      } finally {
        setSuggestedActionDealId(null);
      }
    },
    [companyId, refreshOpenTasksAndNotifications]
  );

  const handleQuickCompleteFirstTask = useCallback(
    async (dealId: string) => {
      const list = openTasksByDealId[dealId] ?? [];
      const first = list.find(
        (t) => t.type === "task" && !t.is_completed
      );
      if (!first) return;
      setQuickCompletingDealId(dealId);
      try {
        await patchActivity(companyId, first.id, { is_completed: true });
        await refreshOpenTasksAndNotifications();
      } catch (err) {
        if (typeof window !== "undefined") {
          window.alert(
            err instanceof Error ? err.message : "Не удалось закрыть задачу"
          );
        }
      } finally {
        setQuickCompletingDealId(null);
      }
    },
    [companyId, openTasksByDealId, refreshOpenTasksAndNotifications]
  );
  const handleTaskComplete = useCallback(
    async (taskId: string) => {
      setCompletingTaskId(taskId);
      try {
        await patchActivity(companyId, taskId, { is_completed: true });
        await refreshOpenTasksAndNotifications();
      } catch (err) {
        if (typeof window !== "undefined") {
          window.alert(
            err instanceof Error ? err.message : "Не удалось закрыть задачу"
          );
        }
      } finally {
        setCompletingTaskId(null);
      }
    },
    [companyId, refreshOpenTasksAndNotifications]
  );

  const [notificationFocus, setNotificationFocus] = useState<
    NotificationItem["type"] | null
  >(null);

  const staleDealIdList = useMemo(
    () => staleDeals.map((s) => String(s.id)),
    [staleDeals]
  );

  const highlightedDealIds = useMemo(() => {
    if (!notificationFocus) return null;
    return computeHighlightedDealIds(
      notificationFocus,
      openTasksByDealId,
      staleDealIdList
    );
  }, [notificationFocus, openTasksByDealId, staleDealIdList]);

  const filterDimActive = Boolean(
    notificationFocus &&
      highlightedDealIds &&
      highlightedDealIds.size > 0
  );

  const highlightSet = highlightedDealIds ?? new Set<string>();
  const attentionDealIds = useMemo(() => {
    const out = new Set<string>();
    for (const s of staleDeals) {
      out.add(String(s.id));
    }
    for (const list of Object.values(dealsByStage)) {
      for (const deal of list ?? []) {
        const dealId = String(deal.id);
        const tasksForDeal = openTasksByDealId[dealId] ?? [];
        const lastTaskTs = tasksForDeal.reduce((maxTs, t) => {
          const ts = new Date(t.created_at).getTime();
          if (!Number.isFinite(ts)) return maxTs;
          return Math.max(maxTs, ts);
        }, 0);
        const fallbackTs = deal.created_at ?? null;
        const lastActivityAt =
          lastTaskTs > 0 ? new Date(lastTaskTs).toISOString() : fallbackTs;
        if (isDealStale(lastActivityAt)) {
          out.add(dealId);
        }
      }
    }
    const nowTs = Date.now();
    for (const [dealId, tasks] of Object.entries(openTasksByDealId)) {
      const hasOverdue = (tasks ?? []).some((t) => {
        if (t.type !== "task" || t.is_completed || !t.due_date) return false;
        const dueTs = new Date(t.due_date).getTime();
        return Number.isFinite(dueTs) && dueTs < nowTs;
      });
      if (hasOverdue) {
        out.add(String(dealId));
      }
    }
    return out;
  }, [dealsByStage, openTasksByDealId, staleDeals]);
  const attentionCount = attentionDealIds.size;
  const { overdueTasksCount, todayTasksCount } = useMemo(() => {
    let overdue = 0;
    let today = 0;
    const now = new Date();
    const startToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const startTomorrow = startToday + 24 * 60 * 60 * 1000;
    for (const task of openCompanyTasks) {
      if (task.type !== "task" || task.is_completed || !task.due_date) continue;
      const ts = new Date(task.due_date).getTime();
      if (!Number.isFinite(ts)) continue;
      if (ts < startToday) overdue += 1;
      else if (ts >= startToday && ts < startTomorrow) today += 1;
    }
    return { overdueTasksCount: overdue, todayTasksCount: today };
  }, [openCompanyTasks]);

  const handleNotificationSelect = useCallback((item: NotificationItem) => {
    setNotificationFocus((prev) => (prev === item.type ? null : item.type));
  }, []);

  const handleNotificationClear = useCallback(() => {
    setNotificationFocus(null);
  }, []);

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

  useEffect(() => {
    const run = async () => {
      try {
        const tasks = await getCompanyOpenTasks(companyId);
        setOpenCompanyTasks(tasks);
      } catch {
        setOpenCompanyTasks([]);
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
                    created_at:
                      updatedDeal.created_at ?? deal.created_at,
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
    if (!stages.length) {
      if (typeof window !== "undefined") {
        window.alert("Нет доступных стадий. Сначала добавьте этапы воронки.");
      }
      return;
    }
    setModalMode("create");
    setDealInModal(null);
    setModalError(null);
    setModalOpen(true);
  }, [stages]);

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

      const clientPk = Number.parseInt(values.clientId, 10);
      if (!Number.isFinite(clientPk)) {
        setModalError("Некорректный клиент.");
        return;
      }

      const clientRow = clients.find((c) => String(c.id) === values.clientId);
      if (!clientRow) {
        setModalError(
          "Клиент не найден в списке текущей компании. Обновите страницу или выберите другого клиента."
        );
        return;
      }

      const tenantId = getStoredCompanyId() ?? companyId;
      if (
        clientRow.company != null &&
        String(clientRow.company) !== String(tenantId)
      ) {
        setModalError("Этот клиент не относится к текущей компании.");
        return;
      }

      if (typeof console !== "undefined") {
        console.log("[createDeal] POST /deals/", {
          clientId: clientPk,
          companyId: getStoredCompanyId(),
          companyIdProp: companyId,
        });
      }

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
          client: clientPk,
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
    [clients, companyId, setDealsByStage]
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

        setDealsByStage((prev) =>
          upsertDealInGrouped(prev, {
            ...dealInModal,
            ...normalized,
            created_at:
              normalized.created_at ?? dealInModal.created_at,
          })
        );
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
        const tenantId = getStoredCompanyId() ?? companyId;
        await deleteClient(tenantId, client.id);
        const refreshed = await getClients(tenantId);
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
        const tenantId = getStoredCompanyId() ?? companyId;
        console.log("CREATE CLIENT", {
          companyId: getStoredCompanyId(),
          companyIdProp: companyId,
          tenantIdUsed: tenantId,
        });
        await createClient(tenantId, {
          name: values.name,
          email: values.email || undefined,
        });
        const refreshed = await getClients(tenantId);
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

      <NotificationBar
        items={notificationItems}
        totalBadge={notificationTotal}
        activeType={notificationFocus}
        onSelect={handleNotificationSelect}
        onClear={handleNotificationClear}
      />
      {(overdueTasksCount > 0 || todayTasksCount > 0) ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          {overdueTasksCount > 0 ? (
            <span className="rounded border border-red-200 bg-red-50 px-2 py-1 text-red-700">
              🔴 {overdueTasksCount} overdue
            </span>
          ) : null}
          {todayTasksCount > 0 ? (
            <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">
              🟡 {todayTasksCount} today
            </span>
          ) : null}
        </div>
      ) : null}

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
            ⚠️ {staleDeals.length}{" "}
            {staleDeals.length === 1
              ? "deal requires follow-up"
              : "deals require follow-up"}
          </p>
          <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
            {staleDeals.map((s) => {
              const staleAmount = formatDealAmountUsd(s.amount);
              return (
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
                  <span className="block text-xs text-gray-600">
                    Client: {s.client_name ?? String(s.client)}
                  </span>
                  {staleAmount ? (
                    <span className="mt-0.5 block text-sm font-medium text-gray-900">
                      {staleAmount}
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
              );
            })}
          </ul>
        </div>
      ) : null}
      {attentionCount > 0 ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="font-semibold">
            ⚠️ {attentionCount}{" "}
            {attentionCount === 1
              ? "deal needs attention"
              : "deals need attention"}
          </p>
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
              openTasksByDealId={openTasksByDealId}
              highlightDealIds={highlightSet}
              filterDimActive={filterDimActive}
              isLoading={dndLoading}
              deletingDealId={deletingDealId}
              dragDisabled={Boolean(deletingDealId || dndLoading)}
              onDealOpen={openEdit}
              onDealDelete={(d) => void handleDelete(d)}
              onQuickCompleteFirstTask={handleQuickCompleteFirstTask}
              quickCompletingDealId={quickCompletingDealId}
              onQuickAddTask={handleQuickAddTask}
              quickAddingTaskDealId={quickAddingTaskDealId}
              onInlineSaveDeal={patchDealInline}
              inlineSavingDealId={inlineSavingDealId}
              onMoveToFallbackStage={moveDealToFallbackStage}
              movingStageDealId={movingStageDealId}
              onSuggestedAction={handleSuggestedAction}
              suggestedActionLoadingDealId={suggestedActionDealId}
              attentionDealIds={attentionDealIds}
              onTaskComplete={handleTaskComplete}
              completingTaskId={completingTaskId}
            />
          ))}
        </div>
        <DragOverlay>
          {overlayDeal ? (
            <div
              className={`w-60 cursor-grabbing rounded bg-white p-3 opacity-95 shadow-xl ring-2 ${
                filterDimActive &&
                highlightSet.has(String(overlayDeal.id))
                  ? "ring-blue-600 ring-4"
                  : "ring-blue-300"
              }`}
            >
              <DealCardContent
                deal={overlayDeal}
                clients={clients}
                openTasksForDeal={
                  openTasksByDealId[String(overlayDeal.id)] ?? []
                }
              />
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
          onActivitiesMutated={refreshOpenTasksAndNotifications}
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
