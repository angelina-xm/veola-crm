"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import { useAuth } from "@/src/components/auth/AuthProvider";
import { useMembership } from "@/src/context/MembershipContext";
import {
  completeCrmTask,
  createCrmTask,
  getClients,
  getDeals,
  getTasksBucket,
  getTeamMembers,
  type TeamMember,
  normalizeApiList,
  patchCrmTask,
} from "@/src/lib/api";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import { normalizeDealPayload } from "@/src/lib/dealGrouping";
import { queueOpenDeal } from "@/src/lib/openDealBridge";
import { ROUTES } from "@/src/lib/product";
import { canCreateDeals } from "@/src/lib/roles";
import { defaultDueDatetimeLocal } from "@/src/lib/taskSemantics";
import TaskAssigneeSelect, {
  resolveAssigneeUserId,
  type AssigneeChoice,
} from "@/src/components/tasks/TaskAssigneeSelect";
import {
  priorityBadgeClass,
  priorityLabel,
  taskDueChip,
  taskStatusBadgeClass,
  taskStatusLabel,
} from "@/src/lib/taskSemantics";
import type { Client, CrmTask, Deal, TaskBucketQuery, TaskPriority } from "@/src/types";

type TaskScope = "my" | "team";

const BUCKETS: TaskBucketQuery[] = ["today", "upcoming", "overdue", "completed"];

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDueLabel(iso: string | null): string {
  if (!iso) return "No due date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function priorityChipClass(p: TaskPriority): string {
  switch (p) {
    case "urgent":
      return "bg-rose-100 text-rose-800 ring-1 ring-rose-200";
    case "high":
      return "bg-orange-100 text-orange-900 ring-1 ring-orange-200/80";
    case "low":
      return "bg-zinc-100 text-zinc-600";
    default:
      return "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100";
  }
}

function cardShellClass(task: CrmTask, section: TaskBucketQuery): string {
  const base =
    "rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md";
  if (task.is_completed || section === "completed") {
    return `${base} border-zinc-100 opacity-70`;
  }
  if (section === "overdue" || task.state === "overdue") {
    return `${base} border-rose-200 ring-1 ring-rose-100/80`;
  }
  if (task.priority === "urgent") {
    return `${base} border-rose-100 border-l-4 border-l-rose-500`;
  }
  if (task.priority === "high") {
    return `${base} border-orange-100 border-l-4 border-l-orange-400`;
  }
  return `${base} border-zinc-200 border-l-4 border-l-indigo-200`;
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-sm text-zinc-500">Loading tasks…</div>
      }
    >
      <TasksPageContent />
    </Suspense>
  );
}

function TasksPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isReady, isAuthenticated } = useAuth();
  const { membership, loading: membershipLoading } = useMembership();
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [scope, setScope] = useState<TaskScope>("my");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [byBucket, setByBucket] = useState<Record<TaskBucketQuery, CrmTask[]>>({
    today: [],
    upcoming: [],
    overdue: [],
    completed: [],
  });
  const [busyId, setBusyId] = useState<number | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [newDealId, setNewDealId] = useState<string>("");
  const [newClientId, setNewClientId] = useState<string>("");
  const [newContent, setNewContent] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assigneeChoice, setAssigneeChoice] = useState<AssigneeChoice>({
    type: "me",
  });

  const allowCreate = useMemo(() => canCreateDeals(membership), [membership]);

  const selectedDeal = useMemo(
    () => deals.find((d) => String(d.id) === newDealId),
    [deals, newDealId]
  );

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setCreateOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (createOpen && !newDue) {
      setNewDue(defaultDueDatetimeLocal());
    }
  }, [createOpen, newDue]);

  useEffect(() => {
    if (companyId === null) return;
    void getTeamMembers(companyId)
      .then((p) => setTeamMembers(p.members))
      .catch(() => setTeamMembers([]));
  }, [companyId]);

  useEffect(() => {
    if (newDealId && selectedDeal?.assigned_to) {
      setAssigneeChoice({ type: "deal_owner" });
    }
  }, [newDealId, selectedDeal?.assigned_to]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, []);

  useLayoutEffect(() => {
    if (!isReady || !isAuthenticated) return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, [isReady, isAuthenticated]);

  const loadBuckets = useCallback(async () => {
    if (companyId === null) return;
    setLoading(true);
    setError(null);
    try {
      const opts = { scope } as const;
      const pairs = await Promise.all(
        BUCKETS.map(async (bucket) => {
          const rows = await getTasksBucket(companyId, bucket, opts);
          return [bucket, rows] as const;
        })
      );
      const next: Record<TaskBucketQuery, CrmTask[]> = {
        today: [],
        upcoming: [],
        overdue: [],
        completed: [],
      };
      for (const [b, rows] of pairs) {
        next[b] = rows;
      }
      setByBucket(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [companyId, scope]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || companyId === null) return;
    void loadBuckets();
  }, [isReady, isAuthenticated, companyId, loadBuckets]);

  const ensureCreateRefs = useCallback(async () => {
    if (companyId === null) return;
    setCreateLoading(true);
    try {
      const [dealsRaw, clientRows] = await Promise.all([
        getDeals(companyId),
        getClients(companyId),
      ]);
      const dealList = normalizeApiList(
        dealsRaw as { id: string | number; title: string; stage?: string | number | null; amount?: string | number; client?: string | number | null; created_at?: string }[]
      ).map((d) => normalizeDealPayload(d));
      setDeals(dealList);
      setClients(clientRows);
    } finally {
      setCreateLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (createOpen && allowCreate && companyId !== null) {
      void ensureCreateRefs();
    }
  }, [createOpen, allowCreate, companyId, ensureCreateRefs]);

  const openDealOnBoard = useCallback(
    (dealId: number | null) => {
      if (dealId == null) return;
      queueOpenDeal(dealId);
      router.push(ROUTES.deals);
    },
    [router]
  );

  const onComplete = async (task: CrmTask) => {
    if (companyId === null || task.is_completed) return;
    setBusyId(task.id);
    try {
      await completeCrmTask(companyId, task.id);
      await loadBuckets();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not complete task");
    } finally {
      setBusyId(null);
    }
  };

  const onSaveReschedule = async (task: CrmTask, localDue: string) => {
    if (companyId === null) return;
    const iso =
      localDue.trim() === ""
        ? null
        : new Date(localDue).toISOString();
    setBusyId(task.id);
    try {
      await patchCrmTask(companyId, task.id, { due_date: iso });
      await loadBuckets();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not reschedule");
    } finally {
      setBusyId(null);
    }
  };

  const onSaveEdit = async (
    task: CrmTask,
    patch: { content: string; priority: TaskPriority }
  ) => {
    if (companyId === null) return;
    setBusyId(task.id);
    try {
      await patchCrmTask(companyId, task.id, {
        content: patch.content,
        priority: patch.priority,
      });
      await loadBuckets();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not save task");
    } finally {
      setBusyId(null);
    }
  };

  const onCreate = async () => {
    if (companyId === null) return;
    const dealNum = newDealId ? Number.parseInt(newDealId, 10) : NaN;
    const clientNum = newClientId ? Number.parseInt(newClientId, 10) : NaN;
    if (!newContent.trim()) {
      window.alert("Describe the follow-up.");
      return;
    }
    if (!Number.isFinite(dealNum) && !Number.isFinite(clientNum)) {
      window.alert("Choose a deal or a client.");
      return;
    }
    setCreateLoading(true);
    try {
      if (!membership?.user_id) {
        window.alert("Session not ready. Try again.");
        return;
      }
      const assigned_to = resolveAssigneeUserId(
        assigneeChoice,
        membership.user_id,
        selectedDeal?.assigned_to ?? null
      );

      await createCrmTask(companyId, {
        content: newContent.trim(),
        deal: Number.isFinite(dealNum) ? dealNum : undefined,
        client:
          Number.isFinite(dealNum) || !Number.isFinite(clientNum)
            ? undefined
            : clientNum,
        due_date: newDue ? new Date(newDue).toISOString() : undefined,
        priority: newPriority,
        assigned_to,
      });
      setNewContent("");
      setNewDue("");
      setNewDealId("");
      setNewClientId("");
      setNewPriority("medium");
      setAssigneeChoice({ type: "me" });
      setNewDue(defaultDueDatetimeLocal());
      setCreateOpen(false);
      await loadBuckets();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not create task");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <>
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                Tasks
              </h1>
              <p className="mt-1 max-w-xl text-sm text-zinc-500">
                Follow-ups and operational work across visible deals. Use{" "}
                <span className="font-medium text-zinc-700">My queue</span> for
                items assigned to you (or unassigned tasks you created).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 text-xs font-medium shadow-sm">
                <button
                  type="button"
                  onClick={() => setScope("my")}
                  className={`rounded-md px-3 py-1.5 ${
                    scope === "my"
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  My queue
                </button>
                <button
                  type="button"
                  onClick={() => setScope("team")}
                  className={`rounded-md px-3 py-1.5 ${
                    scope === "team"
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  Team
                </button>
              </div>
              {allowCreate ? (
                <button
                  type="button"
                  onClick={() => setCreateOpen((v) => !v)}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
                >
                  {createOpen ? "Close" : "New follow-up"}
                </button>
              ) : null}
            </div>
          </header>

          {membershipBlock(membershipLoading, error, createOpen, allowCreate, {
            clients,
            deals,
            newClientId,
            newContent,
            newDealId,
            newDue,
            newPriority,
            createLoading,
            teamMembers,
            membershipUserId: membership?.user_id ?? 0,
            selectedDealOwnerId: selectedDeal?.assigned_to ?? null,
            assigneeChoice,
            setAssigneeChoice,
            setNewClientId,
            setNewContent,
            setNewDealId,
            setNewDue,
            setNewPriority,
            onCreate,
          })}

          {loading &&
          BUCKETS.every((b) => (byBucket[b] ?? []).length === 0) ? (
            <div className="mb-6 rounded-2xl border border-zinc-200 bg-white py-10 text-center text-sm text-zinc-500">
              Loading tasks…
            </div>
          ) : (
          <div className="space-y-10">
            {(
              [
                ["today", "Today", "Due today and still actionable."],
                ["upcoming", "Upcoming", "Later this week or no due date yet."],
                ["overdue", "Overdue", "Past due — needs attention."],
                ["completed", "Completed", "Recently closed."],
              ] as const
            ).map(([key, title, subtitle]) => (
              <section key={key}>
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                      {title}
                    </h2>
                    <p className="text-xs text-zinc-400">{subtitle}</p>
                  </div>
                  <span className="text-xs font-medium text-zinc-400">
                    {byBucket[key].length}
                  </span>
                </div>
                {byBucket[key].length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 bg-white/60 px-4 py-8 text-center text-sm text-zinc-500">
                    Nothing here.
                  </div>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-1">
                    {byBucket[key].map((task) => (
                      <li key={`${key}-${task.id}`}>
                        <TaskRow
                          task={task}
                          section={key}
                          busy={busyId === task.id}
                          onComplete={() => onComplete(task)}
                          onOpenDeal={() => openDealOnBoard(task.deal)}
                          onReschedule={(localDue) =>
                            onSaveReschedule(task, localDue)
                          }
                          onSaveEdit={(c, p) => onSaveEdit(task, { content: c, priority: p })}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
          )}
      </>
    </ProtectedRoute>
  );
}

function membershipBlock(
  membershipLoading: boolean,
  error: string | null,
  createOpen: boolean,
  allowCreate: boolean,
  form: {
    clients: Client[];
    deals: Deal[];
    newClientId: string;
    newContent: string;
    newDealId: string;
    newDue: string;
    newPriority: TaskPriority;
    createLoading: boolean;
    teamMembers: TeamMember[];
    membershipUserId: number;
    selectedDealOwnerId: number | null;
    assigneeChoice: AssigneeChoice;
    setAssigneeChoice: (v: AssigneeChoice) => void;
    setNewClientId: (v: string) => void;
    setNewContent: (v: string) => void;
    setNewDealId: (v: string) => void;
    setNewDue: (v: string) => void;
    setNewPriority: (v: TaskPriority) => void;
    onCreate: () => void;
  }
) {
  if (membershipLoading) {
    return (
      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white py-12 text-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }
  return (
    <>
      {error ? (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {createOpen && allowCreate ? (
        <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">New follow-up</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Link to a deal when you can. Due today by default — adjust who owns
            the follow-up.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600">
              Deal
              <select
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                value={form.newDealId}
                onChange={(e) => {
                  form.setNewDealId(e.target.value);
                  if (e.target.value) form.setNewClientId("");
                }}
                disabled={form.createLoading}
              >
                <option value="">—</option>
                {form.deals.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Client (if no deal)
              <select
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                value={form.newClientId}
                onChange={(e) => {
                  form.setNewClientId(e.target.value);
                  if (e.target.value) form.setNewDealId("");
                }}
                disabled={form.createLoading || Boolean(form.newDealId)}
              >
                <option value="">—</option>
                {form.clients.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-full block text-xs font-medium text-zinc-600">
              What to do
              <textarea
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                rows={3}
                value={form.newContent}
                onChange={(e) => form.setNewContent(e.target.value)}
                placeholder="Call, send proposal, book meeting…"
                disabled={form.createLoading}
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Due
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                value={form.newDue}
                onChange={(e) => form.setNewDue(e.target.value)}
                disabled={form.createLoading}
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Priority
              <select
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                value={form.newPriority}
                onChange={(e) =>
                  form.setNewPriority(e.target.value as TaskPriority)
                }
                disabled={form.createLoading}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <div className="col-span-full">
              <TaskAssigneeSelect
                members={form.teamMembers}
                currentUserId={form.membershipUserId}
                dealOwnerUserId={form.selectedDealOwnerId}
                value={form.assigneeChoice}
                onChange={form.setAssigneeChoice}
                disabled={form.createLoading}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={form.onCreate}
              disabled={form.createLoading}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {form.createLoading ? "Saving…" : "Create task"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function TaskRow(props: {
  task: CrmTask;
  section: TaskBucketQuery;
  busy: boolean;
  onComplete: () => void;
  onOpenDeal: () => void;
  onReschedule: (localDue: string) => void;
  onSaveEdit: (content: string, priority: TaskPriority) => void;
}) {
  const { task, section, busy, onComplete, onOpenDeal, onReschedule, onSaveEdit } =
    props;
  const [expandSchedule, setExpandSchedule] = useState(false);
  const [expandEdit, setExpandEdit] = useState(false);
  const [dueDraft, setDueDraft] = useState(toDatetimeLocalValue(task.due_date));
  const [contentDraft, setContentDraft] = useState(task.content);
  const [priorityDraft, setPriorityDraft] = useState<TaskPriority>(task.priority);

  useEffect(() => {
    setDueDraft(toDatetimeLocalValue(task.due_date));
    setContentDraft(task.content);
    setPriorityDraft(task.priority);
  }, [task.due_date, task.content, task.priority, task.id]);

  const targetLabel =
    task.deal_title && task.client_name
      ? `${task.deal_title} · ${task.client_name}`
      : task.deal_title || task.client_name || "—";

  return (
    <div className={cardShellClass(task, section)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${taskStatusBadgeClass(task)}`}
            >
              {taskStatusLabel(task)}
            </span>
            {taskDueChip(task) ? (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${taskDueChip(task)!.className}`}
              >
                {taskDueChip(task)!.label}
              </span>
            ) : null}
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityBadgeClass(task.priority)}`}
            >
              {priorityLabel(task.priority)}
            </span>
            {task.state === "backlog" && !task.is_completed ? (
              <span className="text-[10px] font-medium text-zinc-400">No due date</span>
            ) : null}
          </div>
          <p className="text-sm font-medium text-zinc-900">{task.content || "—"}</p>
          <p className="truncate text-xs text-zinc-500">{targetLabel}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
            <span>{formatDueLabel(task.due_date)}</span>
            <span className="text-zinc-400">·</span>
            <span>
              {task.assigned_to_email
                ? task.assigned_to_email
                : "Unassigned"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5 sm:justify-end">
          {!task.is_completed ? (
            <button
              type="button"
              disabled={busy}
              onClick={onComplete}
              className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Done
            </button>
          ) : null}
          {!task.is_completed ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setExpandSchedule((v) => !v)}
              className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {expandSchedule ? "Close" : "Reschedule"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => setExpandEdit((v) => !v)}
            className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {expandEdit ? "Close" : "Edit"}
          </button>
          {task.deal ? (
            <button
              type="button"
              onClick={onOpenDeal}
              className="rounded-md border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-800 hover:bg-indigo-100"
            >
              Deal
            </button>
          ) : task.client ? (
            <Link
              href={`/clients/${task.client}`}
              className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Client
            </Link>
          ) : null}
        </div>
      </div>
      {expandSchedule && !task.is_completed ? (
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-3">
          <label className="text-xs font-medium text-zinc-600">
            New due
            <input
              type="datetime-local"
              className="mt-1 block rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
              value={dueDraft}
              onChange={(e) => setDueDraft(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void onReschedule(dueDraft);
              setExpandSchedule(false);
            }}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setDueDraft("");
              void onReschedule("");
            }}
            className="text-xs text-zinc-500 underline hover:text-zinc-700"
          >
            Clear due
          </button>
        </div>
      ) : null}
      {expandEdit ? (
        <div className="mt-4 space-y-2 border-t border-zinc-100 pt-3">
          <textarea
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            rows={3}
            value={contentDraft}
            onChange={(e) => setContentDraft(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
              value={priorityDraft}
              onChange={(e) =>
                setPriorityDraft(e.target.value as TaskPriority)
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void onSaveEdit(contentDraft, priorityDraft);
                setExpandEdit(false);
              }}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              Save changes
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
