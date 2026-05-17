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
import { useRouter } from "next/navigation";
import Stage from "./Stage";
import DealModal from "./DealModal";
import NotificationBar from "@/src/components/notifications/NotificationBar";
import {
  DealCardContent,
  getDealHealth,
  type StageFallbackPreset,
  type SuggestedAction,
} from "./DealCard";
import {
  createActivity,
  createDeal,
  deleteDeal,
  getAnalyticsV1Overview,
  getCompanyNotes,
  getCompanyOpenTasks,
  getPipelineHealth,
  getStaleDeals,
  patchActivity,
  patchDeal,
  type NotificationItem,
  type PatchDealPayload,
} from "@/src/lib/api";
import CloseDealLostModal, {
  type CloseDealLostPayload,
} from "@/src/components/pipeline/CloseDealLostModal";
import CloseDealWonModal, {
  type CloseDealWonPayload,
} from "@/src/components/pipeline/CloseDealWonModal";
import CloseDropZones from "@/src/components/pipeline/CloseDropZones";
import {
  type CloseOutcome,
  isCloseDropZoneId,
  isClosedStageName,
  outcomeFromCloseZoneId,
} from "@/src/lib/pipelineLifecycle";
import {
  clientNameById,
  formatCreatedRelative,
  formatDealAmountUsd,
  formatDealIdLabel,
} from "@/src/lib/dealDisplay";
import { groupOpenTasksByDealId } from "@/src/lib/dealTaskSignal";
import { createTaskFromPreset, type TaskPreset } from "@/src/lib/quickTask";
import { type AutomationSettings } from "@/src/lib/autoTaskRules";
import { computeHighlightedDealIds } from "@/src/lib/notificationDealHighlight";
import { OPEN_DEAL_SESSION_KEY } from "@/src/lib/openDealBridge";
import { DAY_MS, scaleMs } from "@/src/lib/timeConfig";
import { useNotifications } from "@/src/hooks/useNotifications";
import { useMembership } from "@/src/context/MembershipContext";
import { getStoredCompanyId } from "@/src/lib/auth";
import {
  canCreateDeals,
  canDeleteDeals,
  canManageDeals,
  canViewAnalytics,
} from "@/src/lib/roles";
import {
  normalizeDealPayload,
  removeDealFromGrouped,
  upsertDealInGrouped,
} from "@/src/lib/dealGrouping";
import {
  Activity,
  AnalyticsV1Overview,
  Client,
  DealsByStage,
  Deal,
  PipelineStage,
  StaleDeal,
} from "@/src/types";
import PipelineAnalyticsCompact from "@/src/components/analytics/PipelineAnalyticsCompact";
import PipelineHealthBanner from "@/src/components/pipeline/PipelineHealthBanner";
import type { PipelineHealth } from "@/src/types";

type PendingClose = {
  deal: Deal;
  outcome: CloseOutcome;
  targetStageId: number;
};

interface BoardProps {
  stages: PipelineStage[];
  wonStage?: PipelineStage;
  lostStage?: PipelineStage;
  dealsByStage: DealsByStage;
  setDealsByStage: React.Dispatch<React.SetStateAction<DealsByStage>>;
  companyId: number;
  clients: Client[];
  automationSettings: AutomationSettings;
  automationSettingsLoading: boolean;
}

type PriorityLabel = "high" | "medium" | "low";

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
  scaleMs(
    process.env.NEXT_PUBLIC_DEV_FAST === "true" ? 60 * 1000 : 48 * 60 * 60 * 1000
  );
const CREATED_GRACE_MS = scaleMs(DAY_MS);

function isDealStale({
  createdAt,
  lastActivityAt,
}: {
  createdAt?: string;
  lastActivityAt?: string | null;
}): boolean {
  const now = Date.now();
  const parsedCreated = new Date(createdAt ?? "").getTime();
  const parsedLast = new Date(lastActivityAt ?? "").getTime();
  console.log("DEBUG DEAL FULL", {
    created_at: createdAt ?? null,
    parsedCreated,
    lastActivity: lastActivityAt ?? null,
    parsedLast: Number.isFinite(parsedLast) ? parsedLast : null,
    now,
    STALE_MS,
  });
  const createdTs = parsedCreated;
  const createdIsValid = Number.isFinite(createdTs);

  if (createdIsValid && now - createdTs < CREATED_GRACE_MS) {
    return false;
  }

  const lastTs = parsedLast;
  const referenceTs = Number.isFinite(lastTs)
    ? lastTs
    : createdIsValid
      ? createdTs
      : NaN;

  if (!Number.isFinite(referenceTs)) return false;
  return now - referenceTs > STALE_MS;
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
  wonStage,
  lostStage,
  dealsByStage,
  setDealsByStage,
  companyId,
  clients,
  automationSettings,
  automationSettingsLoading,
}: BoardProps) {
  const { membership, loading: membershipLoading } = useMembership();
  useEffect(() => {
    console.log("[Board] mount");
    return () => {
      console.log("[Board] unmount");
    };
  }, []);

  useEffect(() => {
    console.log("[Board] automationSettings", {
      automationSettings,
      automationSettingsLoading,
    });
  }, [automationSettings, automationSettingsLoading]);

  const router = useRouter();
  const allowCreateDeals =
    !membershipLoading && canCreateDeals(membership);
  const allowPipelineMutations = canManageDeals(membership);
  const allowDeleteDeals = canDeleteDeals(membership);
  const showAnalytics = canViewAnalytics(membership);
  const [analyticsOverview, setAnalyticsOverview] =
    useState<AnalyticsV1Overview | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [pendingClose, setPendingClose] = useState<PendingClose | null>(null);
  const [closeSubmitting, setCloseSubmitting] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  const loadAnalyticsOverview = useCallback(async () => {
    if (!showAnalytics) return;
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      const data = await getAnalyticsV1Overview(companyId, "week");
      setAnalyticsOverview(data);
    } catch (err) {
      setAnalyticsError(
        err instanceof Error ? err.message : "Failed to load analytics"
      );
    } finally {
      setAnalyticsLoading(false);
    }
  }, [companyId, showAnalytics]);

  useEffect(() => {
    if (!showAnalytics || membershipLoading) return;
    void loadAnalyticsOverview();
  }, [dealsByStage, showAnalytics, membershipLoading, loadAnalyticsOverview]);
  const [overlayDeal, setOverlayDeal] = useState<Deal | null>(null);
  const [dndLoading, setDndLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [dealInModal, setDealInModal] = useState<Deal | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null);
  const [staleDeals, setStaleDeals] = useState<StaleDeal[]>([]);
  const [pipelineHealth, setPipelineHealth] = useState<PipelineHealth | null>(
    null
  );
  const [pipelineHealthLoading, setPipelineHealthLoading] = useState(true);
  const [openCompanyTasks, setOpenCompanyTasks] = useState<Activity[]>([]);
  const [notesByDealId, setNotesByDealId] = useState<Record<string, Activity[]>>(
    {}
  );

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

  const refreshNotes = useCallback(async () => {
    try {
      const notes = await getCompanyNotes(companyId);
      const grouped: Record<string, Activity[]> = {};
      for (const note of notes) {
        const dealId = String(note.deal);
        grouped[dealId] = [...(grouped[dealId] ?? []), note];
      }
      for (const dealId of Object.keys(grouped)) {
        grouped[dealId].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      setNotesByDealId(grouped);
    } catch {
      setNotesByDealId({});
    }
  }, [companyId]);

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
  const [addingNoteDealId, setAddingNoteDealId] = useState<string | null>(null);
  const [inlineSavingDealId, setInlineSavingDealId] = useState<string | null>(
    null
  );
  const [movingStageDealId, setMovingStageDealId] = useState<string | null>(
    null
  );
  const [sortByPriority, setSortByPriority] = useState(true);
  const [priorityStageOrder, setPriorityStageOrder] = useState<string[] | null>(
    null
  );
  const [priorityStageLabels, setPriorityStageLabels] = useState<
    Record<string, PriorityLabel>
  >({});

  const getDealWeight = (deal: Deal): number => {
    const health = getDealHealth(deal, openTasksByDealId[String(deal.id)] ?? []);
    if (health === "urgent") return 3;
    if (health === "at_risk") return 2;
    return 1;
  };

  useEffect(() => {
    if (!stages.length) {
      setPriorityStageOrder(null);
      setPriorityStageLabels({});
      return;
    }
    const rows = stages.map((stage) => {
      const stageId = String(stage.id);
      const deals = dealsByStage[stageId] ?? [];
      const weight = deals.reduce((acc, deal) => acc + getDealWeight(deal), 0);
      return { stageId, weight };
    });
    rows.sort((a, b) => b.weight - a.weight);
    const labels: Record<string, PriorityLabel> = {};
    for (const row of rows) {
      labels[row.stageId] =
        row.weight >= 9 ? "high" : row.weight >= 4 ? "medium" : "low";
    }
    setPriorityStageOrder(rows.map((r) => r.stageId));
    setPriorityStageLabels(labels);
  }, [stages]);

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
      const targetName = preset === "new" ? "new" : "negotiation";
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
  const handleAddNote = useCallback(
    async (dealId: string) => {
      if (typeof window === "undefined") return;
      const content = window.prompt("Note", "");
      if (content === null) return;
      const trimmed = content.trim();
      if (!trimmed) return;
      const dealNum = Number.parseInt(dealId, 10);
      if (!Number.isFinite(dealNum)) return;
      setAddingNoteDealId(dealId);
      try {
        const tenantId = getStoredCompanyId() ?? companyId;
        await createActivity(tenantId, {
          deal: dealNum,
          type: "note",
          content: trimmed,
        });
        await refreshNotes();
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : "Не удалось создать заметку"
        );
      } finally {
        setAddingNoteDealId(null);
      }
    },
    [companyId, refreshNotes]
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
        const stale = isDealStale({
          createdAt: deal.created_at,
          lastActivityAt,
        });
        console.log("ATTENTION CHECK", {
          dealId: deal.id,
          isStale: stale,
          needsAttention: stale,
        });
        if (stale) {
          out.add(dealId);
        }
      }
    }
    return out;
  }, [dealsByStage, openTasksByDealId]);
  const attentionCount = attentionDealIds.size;
  const syncedNotificationItems = useMemo(() => {
    const next = notificationItems
      .map((item) => {
        if (item.type !== "stale_deals") return item;
        return {
          ...item,
          count: attentionCount,
          message:
            attentionCount === 1
              ? "1 deal needs attention"
              : `${attentionCount} deals need attention`,
        };
      })
      .filter((item) => item.count > 0);
    return next;
  }, [attentionCount, notificationItems]);
  const syncedNotificationTotal = useMemo(
    () => syncedNotificationItems.reduce((acc, item) => acc + item.count, 0),
    [syncedNotificationItems]
  );
  const { overdueTasksCount, todayTasksCount } = useMemo(() => {
    let overdue = 0;
    let today = 0;
    const now = new Date();
    const startToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const startTomorrow = startToday + DAY_MS;
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

  const boardBusy = modalSubmitting || deletingDealId !== null;
  const allDeals = useMemo(
    () => Object.values(dealsByStage).flatMap((list) => list ?? []),
    [dealsByStage]
  );
  const attentionDeals = useMemo(
    () => allDeals.filter((d) => attentionDealIds.has(String(d.id))),
    [allDeals, attentionDealIds]
  );
  const stagesToRender = useMemo(() => {
    if (!sortByPriority || !priorityStageOrder) return stages;
    const byId = new Map(stages.map((s) => [String(s.id), s]));
    const ordered = priorityStageOrder
      .map((id) => byId.get(id))
      .filter((s): s is PipelineStage => Boolean(s));
    const missing = stages.filter(
      (s) => !priorityStageOrder.includes(String(s.id))
    );
    return [...ordered, ...missing];
  }, [priorityStageOrder, sortByPriority, stages]);

  const staleById = useMemo(() => {
    const m = new Map<string, StaleDeal>();
    for (const s of staleDeals) {
      m.set(String(s.id), s);
    }
    return m;
  }, [staleDeals]);

  const refreshInactivityData = useCallback(async () => {
    setPipelineHealthLoading(true);
    try {
      const [list, health] = await Promise.all([
        getStaleDeals(companyId),
        getPipelineHealth(companyId),
      ]);
      setStaleDeals(
        list.filter((deal) =>
          isDealStale({
            createdAt: deal.created_at,
            lastActivityAt: deal.last_activity,
          })
        )
      );
      setPipelineHealth(health);
    } catch {
      setStaleDeals([]);
      setPipelineHealth(null);
    } finally {
      setPipelineHealthLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void refreshInactivityData();
  }, [refreshInactivityData, modalOpen]);

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

  useEffect(() => {
    void refreshNotes();
  }, [refreshNotes]);

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

  const openCloseIntent = useCallback(
    (deal: Deal, outcome: CloseOutcome) => {
      const stage = outcome === "won" ? wonStage : lostStage;
      if (!stage) {
        if (typeof window !== "undefined") {
          window.alert(
            `Pipeline stage "${outcome}" is not configured. Add it in settings or contact an admin.`
          );
        }
        return;
      }
      setCloseError(null);
      setPendingClose({
        deal,
        outcome,
        targetStageId: Number.parseInt(String(stage.id), 10),
      });
    },
    [lostStage, wonStage]
  );

  const handleConfirmCloseWon = useCallback(
    async (payload: CloseDealWonPayload) => {
      if (!pendingClose || pendingClose.outcome !== "won") return;
      setCloseSubmitting(true);
      setCloseError(null);
      try {
        await patchDeal(companyId, pendingClose.deal.id, {
          stage: pendingClose.targetStageId,
          win_reason: payload.win_reason,
        });
        setDealsByStage((prev) =>
          removeDealFromGrouped(prev, String(pendingClose.deal.id))
        );
        setPendingClose(null);
      } catch (err) {
        setCloseError(
          err instanceof Error ? err.message : "Failed to close deal"
        );
      } finally {
        setCloseSubmitting(false);
      }
    },
    [companyId, pendingClose, setDealsByStage]
  );

  const handleConfirmCloseLost = useCallback(
    async (payload: CloseDealLostPayload) => {
      if (!pendingClose || pendingClose.outcome !== "lost") return;
      setCloseSubmitting(true);
      setCloseError(null);
      try {
        await patchDeal(companyId, pendingClose.deal.id, {
          stage: pendingClose.targetStageId,
          loss_reason: payload.loss_reason,
          close_competitor: payload.close_competitor,
          close_notes: payload.close_notes,
        });
        setDealsByStage((prev) =>
          removeDealFromGrouped(prev, String(pendingClose.deal.id))
        );
        setPendingClose(null);
      } catch (err) {
        setCloseError(
          err instanceof Error ? err.message : "Failed to close deal"
        );
      } finally {
        setCloseSubmitting(false);
      }
    },
    [companyId, pendingClose, setDealsByStage]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (dndLoading || closeSubmitting) return;
      const { active, over } = event;

      if (!over) return;
      const activeDealId = parseDealId(String(active.id));
      const overRawId = String(over.id);

      const deal = findDealInBoard(dealsByStage, activeDealId);
      if (!deal) return;

      if (isCloseDropZoneId(overRawId)) {
        openCloseIntent(deal, outcomeFromCloseZoneId(overRawId));
        return;
      }

      const targetStageId = parseStageId(overRawId);
      const targetStage = stages.find((s) => String(s.id) === targetStageId);
      if (targetStage && isClosedStageName(targetStage.name)) {
        openCloseIntent(
          deal,
          targetStage.name.trim().toLowerCase() === "lost" ? "lost" : "won"
        );
        return;
      }

      const computed = computeNextBoardAfterDrag(
        dealsByStage,
        activeDealId,
        overRawId,
        findStageIdByDealId
      );
      if (!computed) return;

      const { next, mutation } = computed;
      setDealsByStage(next);

      const { movedDealId, targetStageId: tgtId } = mutation;

      setDndLoading(true);

      try {
        const raw = await patchDeal(companyId, movedDealId, {
          stage: Number.parseInt(String(tgtId), 10),
        });
        const updatedDeal = readDealPatch(raw);

        setDealsByStage((prev) => {
          const nextBoard: DealsByStage = {};
          const resolvedStageId = String(updatedDeal.stage ?? tgtId);
          for (const [stageId, deals] of Object.entries(prev)) {
            nextBoard[stageId] = deals.map((d) =>
              String(d.id) === movedDealId
                ? {
                    ...d,
                    ...updatedDeal,
                    stage: resolvedStageId,
                    stageId: resolvedStageId,
                    created_at: updatedDeal.created_at ?? d.created_at,
                  }
                : d
            );
          }
          return nextBoard;
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
    [
      closeSubmitting,
      companyId,
      dealsByStage,
      dndLoading,
      findStageIdByDealId,
      openCloseIntent,
      setDealsByStage,
      stages,
    ]
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
    if (!canCreateDeals(membership)) return;
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
  }, [stages, membership]);

  const openEdit = useCallback((deal: Deal) => {
    setModalMode("edit");
    setDealInModal(deal);
    setModalError(null);
    setModalOpen(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(OPEN_DEAL_SESSION_KEY);
    if (!raw) return;
    let deal: Deal | null = null;
    for (const deals of Object.values(dealsByStage)) {
      const d = deals.find((x) => String(x.id) === raw);
      if (d) {
        deal = d;
        break;
      }
    }
    if (!deal) return;
    sessionStorage.removeItem(OPEN_DEAL_SESSION_KEY);
    openEdit(deal);
  }, [dealsByStage, openEdit]);

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

      if (!canCreateDeals(membership)) {
        setModalError("Нет права на создание сделок.");
        return;
      }

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
    [clients, companyId, membership, setDealsByStage]
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

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreate}
            disabled={boardBusy || membershipLoading || !allowCreateDeals}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-50"
          >
            Add Deal
          </button>
          <button
            type="button"
            onClick={() => setSortByPriority((v) => !v)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              sortByPriority
                ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {sortByPriority ? "Sort by priority: on" : "Sort by priority"}
          </button>
        </div>
      </div>

      <NotificationBar
        items={syncedNotificationItems}
        totalBadge={syncedNotificationTotal}
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

      <PipelineHealthBanner
        health={pipelineHealth}
        loading={pipelineHealthLoading}
      />

      {attentionDeals.length > 0 ? (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
          <p className="font-medium">
            {attentionDeals.length}{" "}
            {attentionDeals.length === 1
              ? "deal could use a check-in"
              : "deals could use a check-in"}
          </p>
          <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
            {attentionDeals.map((s) => {
              const staleAmount = formatDealAmountUsd(s.amount);
              const dealId = String(s.id);
              const lastTaskAt = (openTasksByDealId[dealId] ?? []).reduce<string | null>(
                (latest, t) => {
                  const ts = new Date(t.created_at).getTime();
                  if (!Number.isFinite(ts)) return latest;
                  if (!latest) return t.created_at;
                  return ts > new Date(latest).getTime() ? t.created_at : latest;
                },
                null
              );
              const clientLabel =
                clientNameById(clients, s.client) ?? String(s.client ?? "—");
              return (
              <li
                key={s.id}
                className="rounded border border-slate-200 bg-white px-2 py-1.5"
              >
                <button
                  type="button"
                  disabled={boardBusy}
                  onClick={() => {
                    const d = findDealInBoard(dealsByStage, String(s.id));
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
                    Client: {clientLabel}
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
                    {lastTaskAt
                      ? new Date(lastTaskAt).toLocaleString()
                      : "Never"}
                    {" · "}
                    {formatActivityAgo(lastTaskAt, s.created_at)}
                  </span>
                </button>
              </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {showAnalytics ? (
        <PipelineAnalyticsCompact
          data={analyticsOverview}
          loading={analyticsLoading}
          error={analyticsError}
          onRetry={() => void loadAnalyticsOverview()}
        />
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={boardCollisionDetection}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEndWithCleanup}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stagesToRender.map((stage) => (
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
              onDealDelete={(d) => {
                if (!allowDeleteDeals) return;
                void handleDelete(d);
              }}
              onQuickCompleteFirstTask={handleQuickCompleteFirstTask}
              quickCompletingDealId={quickCompletingDealId}
              onQuickAddTask={allowPipelineMutations ? handleQuickAddTask : undefined}
              quickAddingTaskDealId={quickAddingTaskDealId}
              onInlineSaveDeal={allowPipelineMutations ? patchDealInline : undefined}
              inlineSavingDealId={inlineSavingDealId}
              onMoveToFallbackStage={
                allowPipelineMutations ? moveDealToFallbackStage : undefined
              }
              movingStageDealId={movingStageDealId}
              onSuggestedAction={allowPipelineMutations ? handleSuggestedAction : undefined}
              suggestedActionLoadingDealId={suggestedActionDealId}
              attentionDealIds={attentionDealIds}
              onTaskComplete={allowPipelineMutations ? handleTaskComplete : undefined}
              completingTaskId={completingTaskId}
              priorityLabel={
                sortByPriority
                  ? (priorityStageLabels[String(stage.id)] ?? "low")
                  : null
              }
              notesByDealId={notesByDealId}
              onAddNote={allowPipelineMutations ? handleAddNote : undefined}
              addingNoteDealId={addingNoteDealId}
            />
          ))}
          <CloseDropZones
            canClose={allowPipelineMutations}
            hasWon={Boolean(wonStage)}
            hasLost={Boolean(lostStage)}
          />
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

      <CloseDealWonModal
        deal={pendingClose?.outcome === "won" ? pendingClose.deal : null}
        open={pendingClose?.outcome === "won"}
        submitting={closeSubmitting}
        error={closeError}
        onCancel={() => {
          if (!closeSubmitting) {
            setPendingClose(null);
            setCloseError(null);
          }
        }}
        onConfirm={handleConfirmCloseWon}
      />
      <CloseDealLostModal
        deal={pendingClose?.outcome === "lost" ? pendingClose.deal : null}
        open={pendingClose?.outcome === "lost"}
        submitting={closeSubmitting}
        error={closeError}
        onCancel={() => {
          if (!closeSubmitting) {
            setPendingClose(null);
            setCloseError(null);
          }
        }}
        onConfirm={handleConfirmCloseLost}
      />

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
          onCreateClient={() => router.push("/clients")}
          staleRow={
            dealInModal && modalMode === "edit"
              ? staleById.get(String(dealInModal.id)) ?? null
              : null
          }
          onActivitiesMutated={async () => {
            await refreshOpenTasksAndNotifications();
            await refreshInactivityData();
          }}
        />
      ) : null}
    </>
  );
}
