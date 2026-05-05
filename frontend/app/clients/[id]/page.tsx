"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import { useAuth } from "@/src/components/auth/AuthProvider";
import AppNav from "@/src/components/navigation/AppNav";
import {
  createActivity,
  getActivities,
  getClients,
  getDeals,
  normalizeApiList,
} from "@/src/lib/api";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import { normalizeDealPayload } from "@/src/lib/dealGrouping";
import type { Activity, Client, Deal } from "@/src/types";

type ApiDealRow = {
  id: string | number;
  title: string;
  stage?: string | number | null;
  amount?: string | number;
  client?: string | number | null;
  created_at?: string;
};

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
  const [addingNote, setAddingNote] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, []);

  useLayoutEffect(() => {
    if (!isReady || !isAuthenticated) return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, [isReady, isAuthenticated]);

  const loadData = useCallback(async () => {
    if (!companyId || !clientId) return;
    setLoading(true);
    setError(null);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      const [clientsRaw, dealsRaw] = await Promise.all([
        getClients(tenantId),
        getDeals(tenantId),
      ]);
      const found = clientsRaw.find((c) => String(c.id) === clientId) ?? null;
      if (!found) {
        setClient(null);
        setDeals([]);
        setActivities([]);
        setError("Клиент не найден.");
        return;
      }
      const normalizedDeals = normalizeApiList(
        dealsRaw as ApiDealRow[] | { results: ApiDealRow[] }
      )
        .map((d) => normalizeDealPayload(d))
        .filter((d) => String(d.client ?? "") === clientId);

      const activitiesByDeal = await Promise.all(
        normalizedDeals.map((d) => getActivities(tenantId, d.id))
      );
      const mergedActivities = activitiesByDeal
        .flat()
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      setClient(found);
      setDeals(normalizedDeals);
      setActivities(mergedActivities);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить данные.");
      setClient(null);
      setDeals([]);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [clientId, companyId]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || companyId === null) return;
    void loadData();
  }, [companyId, isAuthenticated, isReady, loadData]);

  const stageById = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of deals) {
      const stage = d.stageId ?? d.stage;
      if (stage != null) m.set(String(d.id), String(stage));
    }
    return m;
  }, [deals]);

  const handleAddNote = useCallback(async () => {
    if (!companyId) return;
    if (deals.length === 0) {
      window.alert("Сначала создайте сделку для клиента.");
      return;
    }
    const text = window.prompt("Note", "");
    if (text === null) return;
    const content = text.trim();
    if (!content) return;
    const options = deals.map((d) => `${String(d.id)}: ${d.title}`).join("\n");
    const selected = window.prompt(
      `Deal ID for note:\n${options}`,
      String(deals[0]?.id ?? "")
    );
    if (selected === null) return;
    const dealNum = Number.parseInt(selected.trim(), 10);
    if (!Number.isFinite(dealNum)) return;
    setAddingNote(true);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      await createActivity(tenantId, {
        deal: dealNum,
        type: "note",
        content,
      });
      await loadData();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Не удалось добавить заметку");
    } finally {
      setAddingNote(false);
    }
  }, [companyId, deals, loadData]);

  return (
    <ProtectedRoute>
      <div className="p-6">
        <AppNav />
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Client profile</h1>
            <p className="mt-1 text-sm text-gray-600">Карточка клиента и история</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleAddNote()}
              disabled={addingNote || loading || !client}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {addingNote ? "..." : "📝 Add note"}
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

        {loading ? (
          <p className="text-sm text-gray-600">Загрузка...</p>
        ) : error ? (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {error}
          </div>
        ) : client ? (
          <div className="space-y-4">
            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-lg font-semibold text-gray-900">{client.name}</h2>
              <p className="mt-1 text-sm text-gray-700">{client.email || "—"}</p>
              <p className="text-sm text-gray-700">{client.phone || "—"}</p>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Deals</h3>
              {deals.length === 0 ? (
                <p className="text-sm text-gray-500">No deals yet.</p>
              ) : (
                <ul className="space-y-2">
                  {deals.map((deal) => (
                    <li
                      key={String(deal.id)}
                      className="rounded border border-gray-100 px-3 py-2 text-sm"
                    >
                      <p className="font-medium text-gray-900">{deal.title}</p>
                      <p className="text-gray-700">
                        Amount: {deal.amount != null ? `$${deal.amount}` : "—"}
                      </p>
                      <p className="text-gray-600">
                        Stage: {stageById.get(String(deal.id)) ?? "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Activity</h3>
              {activities.length === 0 ? (
                <p className="text-sm text-gray-500">No activity yet.</p>
              ) : (
                <ul className="space-y-2">
                  {activities.map((a) => (
                    <li
                      key={String(a.id)}
                      className="rounded border border-gray-100 px-3 py-2 text-sm"
                    >
                      <p className="font-medium text-gray-900">
                        {a.type.toUpperCase()}
                      </p>
                      <p className="text-gray-700">{a.content || "—"}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(a.created_at).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
