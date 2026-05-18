"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import { useAuth } from "@/src/components/auth/AuthProvider";
import ClientSectionNav from "@/src/components/clients/ClientSectionNav";
import ClientCommercialWorkspace from "@/src/components/clients/analytics/ClientCommercialWorkspace";
import PageHeader from "@/src/components/ui/PageHeader";
import { useMembership } from "@/src/context/MembershipContext";
import { getClientCommercialAnalytics } from "@/src/lib/api";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import { canViewAnalytics } from "@/src/lib/roles";
import { NAV_LABELS, ROUTES } from "@/src/lib/product";
import type { ClientCommercialAnalytics } from "@/src/types";
import Link from "next/link";

export default function ClientCommercialAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-sm text-zinc-500">
          Loading commercial insights…
        </div>
      }
    >
      <ClientCommercialAnalyticsContent />
    </Suspense>
  );
}

function ClientCommercialAnalyticsContent() {
  const { isReady, isAuthenticated } = useAuth();
  const { membership, loading: membershipLoading } = useMembership();
  const searchParams = useSearchParams();
  const highlightClientId = searchParams.get("highlight");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [productFilter, setProductFilter] = useState("");
  const [data, setData] = useState<ClientCommercialAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allowed = useMemo(() => canViewAnalytics(membership), [membership]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, []);

  const load = useCallback(async () => {
    if (!canViewAnalytics(membership) || companyId === null) return;
    try {
      setLoading(true);
      setError(null);
      const tenantId = getStoredCompanyId() ?? companyId;
      const payload = await getClientCommercialAnalytics(tenantId, {
        productId: productFilter ? Number.parseInt(productFilter, 10) : undefined,
      });
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load commercial insights");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, membership, productFilter]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || companyId === null || membershipLoading) return;
    void load();
  }, [isReady, isAuthenticated, companyId, membershipLoading, load]);

  return (
    <ProtectedRoute>
      <div className="space-y-6 pb-10">
        <ClientSectionNav />
        <PageHeader
          eyebrow="Commercial intelligence"
          title={NAV_LABELS.clientAnalytics}
          description="Who buys what, how relationships perform, and where revenue concentrates — CRM intelligence, not BI."
        />

        {!allowed && !membershipLoading ? (
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-[var(--vx-shadow-card)]">
            <h2 className="text-lg font-semibold text-zinc-900">Access restricted</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Your role needs &quot;View analytics&quot; to open commercial insights. Ask an
              owner or manager to enable it on the Team page.
            </p>
            <Link
              href={ROUTES.clients}
              className="mt-4 inline-block text-sm font-medium text-[var(--vx-accent)] hover:underline"
            >
              ← Back to clients
            </Link>
          </div>
        ) : (
          <ClientCommercialWorkspace
            data={data}
            loading={loading}
            error={error}
            highlightClientId={highlightClientId}
            productFilter={productFilter}
            onProductFilter={setProductFilter}
            onClearFilters={() => setProductFilter("")}
            onRetry={() => void load()}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
