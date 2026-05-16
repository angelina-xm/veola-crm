"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Board from "@/src/components/pipeline/Board";
import {
  AuthError,
  getClients,
  getDeals,
  getPipelineStages,
  groupDealsByStage,
  normalizeApiList,
} from "@/src/lib/api";
import { normalizeDealPayload } from "@/src/lib/dealGrouping";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import { useAuth } from "@/src/components/auth/AuthProvider";
import { useSettings } from "@/src/context/SettingsContext";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import AppNav from "@/src/components/navigation/AppNav";
import { Client, DealsByStage, PipelineStage } from "@/src/types";

type ApiDealRow = {
  id: string | number;
  title: string;
  stage?: string | number | null;
  amount?: string | number;
  client?: string | number | null;
  created_at?: string;
};

export default function PipelinePage() {
  const { isReady, isAuthenticated, logout } = useAuth();
  const {
    settings: automationSettings,
    loading: automationSettingsLoading,
  } = useSettings();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [dealsByStage, setDealsByStage] = useState<DealsByStage>({});
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);

  /** Сразу подставляем tenant из LS + env, чтобы не грузить данные с companyId === null и не расходиться с X-Company-ID. */
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const next = getStoredCompanyId() ?? readEnvCompanyId();
    setCompanyId(next);
  }, []);

  useLayoutEffect(() => {
    if (!isReady || !isAuthenticated) return;
    const fromLs = getStoredCompanyId();
    const next = fromLs ?? readEnvCompanyId();
    setCompanyId((prev) => (prev !== next ? next : prev));
  }, [isReady, isAuthenticated]);

  const totalDeals = useMemo(
    () =>
      Object.values(dealsByStage).reduce(
        (acc, list) => acc + (Array.isArray(list) ? list.length : 0),
        0
      ),
    [dealsByStage]
  );

  useEffect(() => {
    if (!isReady || !isAuthenticated || companyId === null) {
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        setClientsError(null);

        const fromLs = getStoredCompanyId();
        const tenantId = fromLs ?? companyId ?? readEnvCompanyId();
        if (fromLs != null && companyId !== fromLs) {
          setCompanyId(fromLs);
        }

        console.log("LOAD CLIENTS", {
          companyId: getStoredCompanyId(),
          companyIdState: companyId,
          tenantIdUsed: tenantId,
        });

        const [stagesData, dealsData] = await Promise.all([
          getPipelineStages(tenantId),
          getDeals(tenantId),
        ]);

        let clientsData: Client[] = [];
        try {
          clientsData = await getClients(tenantId);
        } catch (clientsErr) {
          setClientsError(
            clientsErr instanceof Error
              ? clientsErr.message
              : "Не удалось загрузить список клиентов."
          );
        }

        const normalizedStages = normalizeApiList(
          stagesData as PipelineStage[] | { results: PipelineStage[] }
        ).map((stage) => ({
          ...stage,
          id: String(stage.id),
        }));
        console.log("stages", normalizedStages);
        if (normalizedStages.length === 0) {
          setError(
            "Этапы воронки не найдены. Создайте стадии для текущей компании."
          );
        }

        const normalizedDeals = normalizeApiList(
          dealsData as ApiDealRow[] | { results: ApiDealRow[] }
        ).map((deal) => normalizeDealPayload(deal));

        const grouped = groupDealsByStage(normalizedDeals, normalizedStages);

        setStages(normalizedStages);
        setDealsByStage(grouped);
        setClients(
          clientsData.map((c) => ({
            ...c,
            id: String(c.id),
          }))
        );
        /* Automation reconcile runs server-side (throttled); not on every pipeline load. */
      } catch (err) {
        console.error("Failed to load pipeline data:", err);
        setClientsError(null);
        if (err instanceof AuthError && err.reason === "network_unreachable") {
          setError(err.message);
          setStages([]);
          setDealsByStage({});
          setClients([]);
          return;
        }
        if (err instanceof AuthError) {
          setError("Сессия истекла. Перенаправляем на вход...");
          logout(err.reason);
          return;
        }
        setError(
          err instanceof Error ? err.message : "Ошибка при загрузке данных"
        );
        setStages([]);
        setDealsByStage({});
        setClients([]);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [companyId, isReady, isAuthenticated, logout]);

  return (
    <ProtectedRoute>
      <div className="p-6">
        <AppNav />
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pipeline 🚀</h1>
              <p className="text-gray-600 mt-1">
                Перетащите сделки между колонками для изменения статуса
              </p>
            </div>
            <button
              type="button"
              onClick={() => logout("manual_logout")}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Выйти
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
              <p className="text-gray-600">Загрузка данных...</p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
            <p className="font-semibold">⚠️ {error}</p>
          </div>
        ) : null}

        {clientsError ? (
          <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-orange-900">
            <p className="font-semibold">Не удалось загрузить клиентов</p>
            <p className="mt-1 text-sm opacity-90">{clientsError}</p>
          </div>
        ) : null}

        {!loading && totalDeals === 0 ? (
          <div className="mb-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-gray-600">
            <p className="text-lg font-medium text-gray-800">No deals yet</p>
            <p className="mt-1 text-sm">
              Создайте первую сделку кнопкой «Add Deal» — она появится в выбранной колонке.
            </p>
          </div>
        ) : null}

        {!loading && companyId !== null ? (
          <Board
            stages={stages}
            dealsByStage={dealsByStage}
            setDealsByStage={setDealsByStage}
            companyId={companyId}
            clients={clients}
            automationSettings={automationSettings}
            automationSettingsLoading={automationSettingsLoading}
          />
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
