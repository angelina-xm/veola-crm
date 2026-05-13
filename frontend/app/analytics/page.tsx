"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import AppNav from "@/src/components/navigation/AppNav";
import { useAuth } from "@/src/components/auth/AuthProvider";
import { useMembership } from "@/src/context/MembershipContext";
import { getAnalyticsV1Overview } from "@/src/lib/api";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import { canViewAnalytics } from "@/src/lib/roles";
import type { AnalyticsGranularity, AnalyticsV1Overview } from "@/src/types";
import AnalyticsWorkspace from "@/src/components/analytics/AnalyticsWorkspace";

export default function AnalyticsPage() {
  const { isReady, isAuthenticated, logout } = useAuth();
  const { membership, loading: membershipLoading } = useMembership();
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [granularity, setGranularity] = useState<AnalyticsGranularity>("week");
  const [data, setData] = useState<AnalyticsV1Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allowed = useMemo(() => canViewAnalytics(membership), [membership]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, []);

  useLayoutEffect(() => {
    if (!isReady || !isAuthenticated) return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, [isReady, isAuthenticated]);

  const load = useCallback(async () => {
    if (!canViewAnalytics(membership) || companyId === null) return;
    try {
      setLoading(true);
      setError(null);
      const payload = await getAnalyticsV1Overview(companyId, granularity);
      setData(payload);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [membership, companyId, granularity]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || companyId === null || !canViewAnalytics(membership)) return;
    void load();
  }, [isReady, isAuthenticated, companyId, membership, load]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-zinc-50/80">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <AppNav />
          {membershipLoading ? (
            <div className="flex min-h-[30vh] items-center justify-center rounded-2xl border border-zinc-200 bg-white py-16 text-sm text-zinc-500">
              Loading…
            </div>
          ) : !allowed ? (
            <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center shadow-sm">
              <h1 className="text-lg font-semibold text-zinc-900">Analytics restricted</h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                Your role does not include analytics access. Ask an owner or manager to enable
                &quot;View analytics&quot; for your seat.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Back to pipeline
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-start justify-between gap-4">
                <Link
                  href="/"
                  className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
                >
                  ← Pipeline
                </Link>
                <button
                  type="button"
                  onClick={() => logout("manual_logout")}
                  className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Sign out
                </button>
              </div>
              <AnalyticsWorkspace
                data={data}
                loading={loading}
                error={error}
                granularity={granularity}
                onGranularityChange={setGranularity}
                onRetry={() => void load()}
              />
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
