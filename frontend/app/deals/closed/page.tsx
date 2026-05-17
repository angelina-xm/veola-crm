"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import PageHeader from "@/src/components/ui/PageHeader";
import RecentClosesWidget from "@/src/components/analytics/RecentClosesWidget";
import { useAuth } from "@/src/components/auth/AuthProvider";
import { getClosedDealsSummary, getDeals } from "@/src/lib/api";
import { normalizeDealPayload } from "@/src/lib/dealGrouping";
import { formatDealAmountUsd } from "@/src/lib/dealDisplay";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import type { ClosedDealsSummary, Deal } from "@/src/types";
import { normalizeApiList } from "@/src/lib/api";
import { COPY, ROUTES } from "@/src/lib/product";

export default function ClosedDealsPage() {
  const { isReady, isAuthenticated } = useAuth();
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [summary, setSummary] = useState<ClosedDealsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, []);

  const load = useCallback(async () => {
    if (companyId === null) return;
    try {
      setLoading(true);
      setError(null);
      const [rawDeals, closedSummary] = await Promise.all([
        getDeals(companyId, { layer: "closed" }),
        getClosedDealsSummary(companyId),
      ]);
      const rows = normalizeApiList(
        rawDeals as Deal[] | { results: Deal[] }
      ).map((d) => normalizeDealPayload(d));
      rows.sort((a, b) => {
        const ta = a.closed_at ? new Date(a.closed_at).getTime() : 0;
        const tb = b.closed_at ? new Date(b.closed_at).getTime() : 0;
        return tb - ta;
      });
      setDeals(rows);
      setSummary(closedSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load closed deals");
      setDeals([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || companyId === null) return;
    void load();
  }, [isReady, isAuthenticated, companyId, load]);

  return (
    <ProtectedRoute>
      <>
        <PageHeader
          eyebrow={COPY.historicalEyebrow}
          title="Closed deals"
          description={COPY.closedDealsHint}
          actions={
            <Link
              href={ROUTES.deals}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              {COPY.backToDeals}
            </Link>
          }
        />

        {error ? (
          <p className="mb-4 text-sm text-red-600">{error}</p>
        ) : null}

        <div className="mb-6">
          <RecentClosesWidget data={summary} loading={loading} />
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : deals.length === 0 ? (
          <p className="text-sm text-gray-500">No closed deals yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Deal</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">Closed</th>
                  <th className="px-4 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deals.map((d) => (
                  <tr key={String(d.id)} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {d.title}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDealAmountUsd(d.amount) ?? "—"}
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-600">
                      {d.stage_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {d.closed_at
                        ? new Date(d.closed_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {d.win_reason || d.loss_reason || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    </ProtectedRoute>
  );
}
