"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Client, DealsByStage, PipelineStage } from "@/src/types";

const FALLBACK_STAGES: PipelineStage[] = [
  { id: "1", name: "Новые" },
  { id: "2", name: "В работе" },
  { id: "3", name: "Переговоры" },
  { id: "4", name: "Готовые" },
];

const FALLBACK_DEALS_BY_STAGE: DealsByStage = {
  "1": [
    { id: "1", title: "Сделка 1", stage: "1", stageId: "1", amount: 50000 },
    { id: "2", title: "Сделка 2", stage: "1", stageId: "1", amount: 75000 },
  ],
  "2": [
    { id: "3", title: "Сделка 3", stage: "2", stageId: "2", amount: 100000 },
  ],
  "3": [],
  "4": [],
};

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
  const [stages, setStages] = useState<PipelineStage[]>(FALLBACK_STAGES);
  const [dealsByStage, setDealsByStage] =
    useState<DealsByStage>(FALLBACK_DEALS_BY_STAGE);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const companyId = Number.parseInt(process.env.NEXT_PUBLIC_COMPANY_ID || "1", 10);

  const totalDeals = useMemo(
    () =>
      Object.values(dealsByStage).reduce(
        (acc, list) => acc + (Array.isArray(list) ? list.length : 0),
        0
      ),
    [dealsByStage]
  );

  useEffect(() => {
    if (!isReady || !isAuthenticated) {
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        setClientsError(null);

        const [stagesData, dealsData] = await Promise.all([
          getPipelineStages(companyId),
          getDeals(companyId),
        ]);

        let clientsData: Client[] = [];
        try {
          clientsData = await getClients(companyId);
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
      } catch (err) {
        console.error("Failed to load pipeline data:", err);
        setClientsError(null);
        if (err instanceof AuthError && err.reason === "network_unreachable") {
          setError(err.message);
          setStages(FALLBACK_STAGES);
          setDealsByStage(FALLBACK_DEALS_BY_STAGE);
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
        setStages(FALLBACK_STAGES);
        setDealsByStage(FALLBACK_DEALS_BY_STAGE);
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
            <p className="mt-1 text-sm opacity-90">
              Используются тестовые данные там, где загрузка не удалась.
            </p>
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

        {!loading ? (
          <Board
            stages={stages}
            dealsByStage={dealsByStage}
            setDealsByStage={setDealsByStage}
            companyId={companyId}
            clients={clients}
          />
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
