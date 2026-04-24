"use client";

import { useEffect, useState } from "react";
import Board from "@/src/components/pipeline/Board";
import { AuthError, getDeals, getPipelineStages, groupDealsByStage } from "@/src/lib/api";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import { useAuth } from "@/src/components/auth/AuthProvider";
import { Deal, DealsByStage, PipelineStage } from "@/src/types";

// Тестовые данные как fallback
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

type ListResponse<T> = T[] | { results: T[] };

function normalizeList<T>(payload: ListResponse<T>): T[] {
  return Array.isArray(payload) ? payload : payload.results;
}

export default function PipelinePage() {
  const { isReady, isAuthenticated, logout } = useAuth();
  const [stages, setStages] = useState<PipelineStage[]>(FALLBACK_STAGES);
  const [dealsByStage, setDealsByStage] = useState<DealsByStage>(FALLBACK_DEALS_BY_STAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const companyId = parseInt(process.env.NEXT_PUBLIC_COMPANY_ID || "1");

  useEffect(() => {
    if (!isReady || !isAuthenticated) {
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 🔄 Параллельная загрузка stages и deals
        const [stagesData, dealsData] = await Promise.all([
          getPipelineStages(companyId),
          getDeals(companyId),
        ]);

        // Нормализуем данные (все id в строки)
        const normalizedStages = normalizeList(stagesData as ListResponse<PipelineStage>).map(
          (stage) => ({
            ...stage,
            id: String(stage.id),
          })
        );

        const normalizedDeals = normalizeList(dealsData as ListResponse<Deal>).map(
          (deal) => ({
            ...deal,
            id: String(deal.id),
            stage: String(deal.stage),
            stageId: String(deal.stage),
          })
        );

        // Группируем сделки по колонкам
        const grouped = groupDealsByStage(normalizedDeals, normalizedStages);

        setStages(normalizedStages);
        setDealsByStage(grouped);
      } catch (err) {
        console.error("Failed to load pipeline data:", err);
        if (err instanceof AuthError) {
          setError("Сессия истекла. Перенаправляем на вход...");
          logout(err.reason);
          return;
        }
        setError(
          err instanceof Error ? err.message : "Ошибка при загрузке данных"
        );
        // Используем fallback данные при ошибке
        setStages(FALLBACK_STAGES);
        setDealsByStage(FALLBACK_DEALS_BY_STAGE);
      } finally {
        setLoading(false);
      }
    };

    loadData();
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
            onClick={() => logout("manual_logout")}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Выйти
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Загрузка данных...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
          <p className="font-semibold">⚠️ {error}</p>
          <p className="text-sm mt-1">Используются тестовые данные</p>
        </div>
      )}

      {!loading && (
        <Board
          stages={stages}
          dealsByStage={dealsByStage}
          companyId={companyId}
        />
      )}
      </div>
    </ProtectedRoute>
  );
}
