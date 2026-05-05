"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import { useAuth } from "@/src/components/auth/AuthProvider";
import AppNav from "@/src/components/navigation/AppNav";
import {
  createActivity,
  deleteActivity,
  getActivities,
  getClients,
  getClientActivities,
  getDeals,
  patchActivity,
  getPipelineStages,
  normalizeApiList,
} from "@/src/lib/api";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import { normalizeDealPayload } from "@/src/lib/dealGrouping";
import type { Activity, Client, Deal, PipelineStage } from "@/src/types";

type ApiDealRow = {
  id: string | number;
  title: string;
  stage?: string | number | null;
  amount?: string | number;
  client?: string | number | null;
  created_at?: string;
};

const CATEGORY_OPTIONS = [
  "Pricing",
  "Interest",
  "Objection",
  "Follow up",
  "Other",
] as const;

function normalizeCategoryKey(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function getClientInsights(activities: Activity[]) {
  let pricingCount = 0;
  let interestCount = 0;
  let objectionCount = 0;
  let followUpCount = 0;

  for (const a of activities) {
    const key = normalizeCategoryKey(a.category);
    if (key === "pricing") pricingCount += 1;
    else if (key === "interest") interestCount += 1;
    else if (key === "objection") objectionCount += 1;
    else if (key === "follow_up") followUpCount += 1;
  }

  const status =
    interestCount >= 3
      ? "High potential"
      : objectionCount >= 3
        ? "At risk"
        : "Neutral";

  return {
    pricingCount,
    interestCount,
    objectionCount,
    followUpCount,
    status,
  };
}

function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(a.getTime() - b.getTime());
  return ms / (24 * 60 * 60 * 1000);
}

function calculateAverageInterval(deals: Deal[]): number {
  const sorted = deals
    .map((d) => new Date(d.created_at ?? "").getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);
  if (sorted.length < 2) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const diffDays = (sorted[i] - sorted[i - 1]) / (24 * 60 * 60 * 1000);
    if (diffDays > 0) {
      sum += diffDays;
      count += 1;
    }
  }
  return count > 0 ? sum / count : 0;
}

function isClientDormant(deals: Deal[]): boolean {
  const dated = deals
    .map((d) => new Date(d.created_at ?? "").getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);
  if (dated.length < 2) return false;
  const avgInterval = calculateAverageInterval(deals);
  if (!Number.isFinite(avgInterval) || avgInterval <= 0) return false;
  const lastDealTs = dated[dated.length - 1];
  const daysSinceLastDeal = daysBetween(new Date(lastDealTs), new Date());
  return daysSinceLastDeal > avgInterval * 1.5;
}

function getClientRecommendations(
  client: Client | null,
  activities: Activity[],
  deals: Deal[]
): string[] {
  if (!client) return [];

  const insights = getClientInsights(activities);
  const recs: string[] = [];

  if (insights.pricingCount >= 3) {
    recs.push("Offer discount");
  }
  if (insights.objectionCount >= 3) {
    recs.push("Address client concerns");
  }

  const lastActivity = activities[0];
  if (lastActivity) {
    const lastTs = new Date(lastActivity.created_at).getTime();
    if (Number.isFinite(lastTs)) {
      const inactiveDays = daysBetween(new Date(lastTs), new Date());
      if (inactiveDays > 30) {
        recs.push("Re-engage client");
      }
    }
  }

  if (isClientDormant(deals)) {
    recs.push("Client likely ready to reorder");
  }

  return recs.slice(0, 4);
}

export default function ClientProfilePage() {
  const { isReady, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = String(params?.id ?? "");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [addingNote, setAddingNote] = useState(false);
  const [addingCall, setAddingCall] = useState(false);
  const [noteCategory, setNoteCategory] = useState<string>("Other");
  const [callCategory, setCallCategory] = useState<string>("Other");
  const [noteContent, setNoteContent] = useState("");
  const [callContent, setCallContent] = useState("");
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [savingActivityId, setSavingActivityId] = useState<string | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, []);

  useLayoutEffect(() => {
    if (!isReady || !isAuthenticated) return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, [isReady, isAuthenticated]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("activity:lastCategory");
    if (saved && CATEGORY_OPTIONS.includes(saved as (typeof CATEGORY_OPTIONS)[number])) {
      setNoteCategory(saved);
      setCallCategory(saved);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!companyId || !clientId) return;
    setLoading(true);
    setError(null);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      const [clientsRaw, dealsRaw, stagesRaw] = await Promise.all([
        getClients(tenantId),
        getDeals(tenantId),
        getPipelineStages(tenantId),
      ]);
      const found = clientsRaw.find((c) => String(c.id) === clientId) ?? null;
      if (!found) {
        setClient(null);
        setDeals([]);
        setActivities([]);
        setStages([]);
        setError("Клиент не найден.");
        return;
      }
      const normalizedStages = normalizeApiList(
        stagesRaw as PipelineStage[] | { results: PipelineStage[] }
      ).map((s) => ({ ...s, id: String(s.id) }));

      const normalizedDeals = normalizeApiList(
        dealsRaw as ApiDealRow[] | { results: ApiDealRow[] }
      )
        .map((d) => normalizeDealPayload(d))
        .filter((d) => String(d.client ?? "") === clientId);

      const byClient = await getClientActivities(tenantId, clientId);
      const byDeals = await Promise.all(
        normalizedDeals.map((d) => getActivities(tenantId, d.id))
      );
      const mergedActivities = [...byClient, ...byDeals.flat()]
        .filter(
          (a, idx, arr) =>
            arr.findIndex((x) => String(x.id) === String(a.id)) === idx
        )
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      setClient(found);
      setDeals(normalizedDeals);
      setActivities(mergedActivities);
      setStages(normalizedStages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить данные.");
      setClient(null);
      setDeals([]);
      setActivities([]);
      setStages([]);
    } finally {
      setLoading(false);
    }
  }, [clientId, companyId]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || companyId === null) return;
    void loadData();
  }, [companyId, isAuthenticated, isReady, loadData]);

  const stageNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of stages) {
      m.set(String(s.id), String(s.name));
    }
    return m;
  }, [stages]);

  const stageBadgeClass = (name: string) => {
    const key = name.trim().toLowerCase();
    if (key === "won") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (key === "negotiation")
      return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const handleAddNote = useCallback(async () => {
    if (!companyId) return;
    if (!noteCategory) return;
    const content = noteContent.trim();
    if (!content) return;

    setAddingNote(true);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      await createActivity(tenantId, {
        client: Number.parseInt(clientId, 10),
        type: "note",
        category: noteCategory,
        content,
      });
      setNoteContent("");
      if (typeof window !== "undefined") {
        window.localStorage.setItem("activity:lastCategory", noteCategory);
      }
      await loadData();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Не удалось добавить заметку");
    } finally {
      setAddingNote(false);
    }
  }, [clientId, companyId, noteCategory, noteContent, loadData]);

  const handleLogCall = useCallback(async () => {
    if (!companyId) return;
    if (!callCategory) return;
    const content = callContent.trim();
    if (!content) return;

    setAddingCall(true);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      await createActivity(tenantId, {
        client: Number.parseInt(clientId, 10),
        type: "call",
        category: callCategory,
        content,
      });
      setCallContent("");
      if (typeof window !== "undefined") {
        window.localStorage.setItem("activity:lastCategory", callCategory);
      }
      await loadData();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Не удалось сохранить звонок");
    } finally {
      setAddingCall(false);
    }
  }, [callCategory, callContent, clientId, companyId, loadData]);

  const lastContact = useMemo(
    () => activities.find((a) => a.type === "call" || a.type === "note") ?? null,
    [activities]
  );
  const insights = useMemo(() => getClientInsights(activities), [activities]);
  const recommendations = useMemo(
    () => getClientRecommendations(client, activities, deals),
    [activities, client, deals]
  );

  const startEditActivity = useCallback((a: Activity) => {
    setEditingActivityId(String(a.id));
    setEditingContent(String(a.content ?? ""));
  }, []);

  const cancelEditActivity = useCallback(() => {
    setEditingActivityId(null);
    setEditingContent("");
  }, []);

  const saveEditedActivity = useCallback(
    async (a: Activity) => {
      if (!companyId) return;
      const id = String(a.id);
      const next = editingContent.trim();
      if (!next) return;
      setSavingActivityId(id);
      try {
        const tenantId = getStoredCompanyId() ?? companyId;
        await patchActivity(tenantId, a.id, { content: next });
        setActivities((prev) =>
          prev.map((row) => (String(row.id) === id ? { ...row, content: next } : row))
        );
        cancelEditActivity();
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Не удалось обновить запись");
      } finally {
        setSavingActivityId(null);
      }
    },
    [cancelEditActivity, companyId, editingContent]
  );

  const handleDeleteActivity = useCallback(
    async (a: Activity) => {
      if (!companyId) return;
      if (
        typeof window !== "undefined" &&
        !window.confirm("Удалить activity?")
      ) {
        return;
      }
      const id = String(a.id);
      setDeletingActivityId(id);
      try {
        const tenantId = getStoredCompanyId() ?? companyId;
        await deleteActivity(tenantId, a.id);
        setActivities((prev) => prev.filter((row) => String(row.id) !== id));
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Не удалось удалить запись");
      } finally {
        setDeletingActivityId(null);
      }
    },
    [companyId]
  );

  return (
    <ProtectedRoute>
      <div className="p-6">
        <AppNav />

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Client profile</h1>
          <p className="mt-1 text-sm text-gray-600">Карточка клиента и история общения</p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-600">Загрузка...</p>
        ) : error ? (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {error}
          </div>
        ) : client ? (
          <div className="space-y-4">
            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-3xl font-bold text-gray-900">{client.name}</h2>
              <p className="mt-1 text-sm text-gray-600">Email: {client.email || "—"}</p>
              <p className="text-sm text-gray-600">Phone: {client.phone || "—"}</p>
            </section>

            <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-2 text-base font-semibold text-gray-900">
                📊 Client Insights
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 md:grid-cols-4">
                <p>Pricing: {insights.pricingCount}</p>
                <p>Interest: {insights.interestCount}</p>
                <p>Objections: {insights.objectionCount}</p>
                <p>Follow ups: {insights.followUpCount}</p>
              </div>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                🔥 Status: {insights.status}
              </p>
            </section>

            {recommendations.length > 0 ? (
              <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                <h3 className="mb-2 text-base font-semibold text-indigo-900">
                  💡 Recommendations
                </h3>
                <ul className="space-y-1 text-sm text-indigo-900">
                  {recommendations.map((rec) => (
                    <li key={rec}>• {rec}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-base font-semibold text-gray-900">Deals</h3>
              {deals.length === 0 ? (
                <p className="text-sm text-gray-500">No deals yet.</p>
              ) : (
                <ul className="space-y-2">
                  {deals.map((deal) => {
                    const stageName =
                      stageNameById.get(String(deal.stageId ?? deal.stage ?? "")) ?? "—";
                    return (
                      <li
                        key={String(deal.id)}
                        className="rounded border border-gray-100 px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-gray-900">{deal.title}</p>
                        <p className="text-gray-700">
                          Amount: {deal.amount != null ? `$${deal.amount}` : "—"}
                        </p>
                        <span
                          className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs ${stageBadgeClass(stageName)}`}
                        >
                          {stageName}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-base font-semibold text-gray-900">Activity</h3>
              {lastContact ? (
                <p className="mb-3 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-800">
                  Last contact:{" "}
                  {lastContact.type === "call" ? "📞" : "📝"}{" "}
                  {lastContact.content || "—"} {" · "}
                  {new Date(lastContact.created_at).toLocaleString()}
                </p>
              ) : null}
              {activities.length === 0 ? (
                <p className="text-sm text-gray-500">No activity yet.</p>
              ) : (
                <ul className="space-y-2">
                  {activities.map((a) => (
                    <li
                      key={String(a.id)}
                      className="rounded border border-gray-100 px-3 py-2 text-sm"
                    >
                      <p className="text-xs text-gray-500">
                        [{new Date(a.created_at).toLocaleString()}]
                      </p>
                      {editingActivityId === String(a.id) ? (
                        <div className="mt-1 space-y-2">
                          <textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            rows={3}
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                            disabled={savingActivityId === String(a.id)}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void saveEditedActivity(a)}
                              disabled={
                                savingActivityId === String(a.id) ||
                                editingContent.trim() === ""
                              }
                              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              {savingActivityId === String(a.id) ? "..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditActivity}
                              disabled={savingActivityId === String(a.id)}
                              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-gray-800">
                            {a.type === "note"
                              ? "📝"
                              : a.type === "call"
                                ? "📞"
                                : a.type === "task"
                                  ? a.is_completed
                                    ? "✔"
                                    : "☐"
                                  : "•"}{" "}
                            {a.category ? `[${a.category}] ` : ""}{a.content || "—"}{" "}
                            <span className="text-xs uppercase text-gray-500">({a.type})</span>
                            {a.type === "task" ? (
                              <span className="ml-2 text-xs normal-case text-gray-600">
                                {a.is_completed ? "✔ completed" : "☐ active"}
                              </span>
                            ) : null}
                          </p>
                          {a.type === "note" || a.type === "call" ? (
                            <div className="mt-1 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEditActivity(a)}
                                disabled={deletingActivityId === String(a.id)}
                                className="text-xs text-gray-600 hover:underline disabled:opacity-50"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteActivity(a)}
                                disabled={deletingActivityId === String(a.id)}
                                className="text-xs text-red-600 hover:underline disabled:opacity-50"
                              >
                                {deletingActivityId === String(a.id)
                                  ? "Deleting..."
                                  : "🗑 Delete"}
                              </button>
                            </div>
                          ) : null}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-base font-semibold text-gray-900">Actions</h3>
              <div className="space-y-2">
                <label className="block text-sm text-gray-700">
                  Category
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value)}
                    disabled={addingNote}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-gray-700">
                  Note
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={3}
                    placeholder="Write note..."
                    disabled={addingNote}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="block text-sm text-gray-700">
                  Category
                  <select
                    value={callCategory}
                    onChange={(e) => setCallCategory(e.target.value)}
                    disabled={addingCall}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-gray-700">
                  Log call
                  <textarea
                    value={callContent}
                    onChange={(e) => setCallContent(e.target.value)}
                    rows={3}
                    placeholder="О чем говорили"
                    disabled={addingCall}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleAddNote()}
                    disabled={addingNote || noteContent.trim() === "" || !noteCategory}
                    className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {addingNote ? "..." : "📝 Add note"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleLogCall()}
                    disabled={addingCall || callContent.trim() === "" || !callCategory}
                    className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {addingCall ? "..." : "📞 Log call"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    Create deal
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
