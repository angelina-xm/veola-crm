"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import Board from "@/src/components/pipeline/Board";
import {
  AuthError,
  getClients,
  getDeals,
  getPipelineStages,
  normalizeApiList,
} from "@/src/lib/api";
import {
  groupOperationalDeals,
  partitionPipelineStages,
} from "@/src/lib/pipelineLifecycle";
import { normalizeDealPayload } from "@/src/lib/dealGrouping";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import { useAuth } from "@/src/components/auth/AuthProvider";
import { useSettings } from "@/src/context/SettingsContext";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import { COPY, ROUTES } from "@/src/lib/product";
import EmptyState from "@/src/components/ui/EmptyState";
import { Client, DealsByStage, PipelineStage } from "@/src/types";

type ApiDealRow = {
  id: string | number;
  title: string;
  stage?: string | number | null;
  amount?: string | number;
  client?: string | number | null;
  created_at?: string;
};

export default function DealsPage() {
  const { isReady, isAuthenticated, logout } = useAuth();
  const {
    settings: automationSettings,
    loading: automationSettingsLoading,
  } = useSettings();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [wonStage, setWonStage] = useState<PipelineStage | undefined>();
  const [lostStage, setLostStage] = useState<PipelineStage | undefined>();
  const [dealsByStage, setDealsByStage] = useState<DealsByStage>({});
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
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
    if (!isReady || !isAuthenticated || companyId === null) return;

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

        const [stagesData, dealsData] = await Promise.all([
          getPipelineStages(tenantId),
          getDeals(tenantId, { layer: "operational" }),
        ]);

        let clientsData: Client[] = [];
        try {
          clientsData = await getClients(tenantId);
        } catch (clientsErr) {
          setClientsError(
            clientsErr instanceof Error
              ? clientsErr.message
              : "Could not load clients."
          );
        }

        const normalizedStages = normalizeApiList(
          stagesData as PipelineStage[] | { results: PipelineStage[] }
        ).map((stage) => ({
          ...stage,
          id: String(stage.id),
        }));

        if (normalizedStages.length === 0) {
          setError("No deal stages configured for this company.");
        }

        const normalizedDeals = normalizeApiList(
          dealsData as ApiDealRow[] | { results: ApiDealRow[] }
        ).map((deal) => normalizeDealPayload(deal));

        const { operationalStages, wonStage: won, lostStage: lost } =
          partitionPipelineStages(normalizedStages);
        const grouped = groupOperationalDeals(normalizedDeals, operationalStages);

        setStages(operationalStages);
        setWonStage(won);
        setLostStage(lost);
        setDealsByStage(grouped);
        setClients(
          clientsData.map((c) => ({
            ...c,
            id: String(c.id),
          }))
        );
      } catch (err) {
        if (err instanceof AuthError && err.reason === "network_unreachable") {
          setError(err.message);
          setStages([]);
          setDealsByStage({});
          setClients([]);
          return;
        }
        if (err instanceof AuthError) {
          setError("Session expired. Redirecting to sign in…");
          logout(err.reason);
          return;
        }
        setError(
          err instanceof Error ? err.message : "Failed to load deals"
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
      <>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">{COPY.dealsBoardHint}</p>
          <Link
            href={ROUTES.dealsClosed}
            className="text-sm font-medium text-[var(--vx-accent)] hover:text-[var(--vx-accent-hover)]"
          >
            {COPY.viewClosedDeals} →
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-800" />
          </div>
        ) : null}

        {error ? (
          <p className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </p>
        ) : null}

        {clientsError ? (
          <p className="mb-4 text-sm text-zinc-500">{clientsError}</p>
        ) : null}

        {!loading && totalDeals === 0 ? (
          <EmptyState
            title="No deals yet"
            description="Use Create → New deal. It will appear on your board in the selected stage."
          />
        ) : null}

        {!loading && companyId !== null && totalDeals > 0 ? (
          <Board
            stages={stages}
            wonStage={wonStage}
            lostStage={lostStage}
            dealsByStage={dealsByStage}
            setDealsByStage={setDealsByStage}
            companyId={companyId}
            clients={clients}
            automationSettings={automationSettings}
            automationSettingsLoading={automationSettingsLoading}
          />
        ) : null}
      </>
    </ProtectedRoute>
  );
}
