"use client";

import { useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import ClientSectionNav from "@/src/components/clients/ClientSectionNav";
import ClientLeaderboardsView from "@/src/components/clients/analytics/ClientLeaderboardsView";
import PageHeader from "@/src/components/ui/PageHeader";
import { useClientCommercialAnalytics } from "@/src/hooks/useClientCommercialAnalytics";
import { NAV_LABELS, ROUTES } from "@/src/lib/product";

export default function ClientLeaderboardsPage() {
  const [productFilter, setProductFilter] = useState("");
  const { data, loading, error, load, allowed, membershipLoading } =
    useClientCommercialAnalytics(productFilter);

  return (
    <ProtectedRoute>
      <div className="space-y-6 pb-10">
        <ClientSectionNav />
        <PageHeader
          eyebrow="Client intelligence"
          title={NAV_LABELS.clientLeaderboards}
          description="Top buyers, growth leaders, and product-specific rankings — operational CRM leaderboards."
        />

        {!allowed && !membershipLoading ? (
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-[var(--vx-shadow-card)]">
            <h2 className="text-lg font-semibold text-zinc-900">Access restricted</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Enable &quot;View analytics&quot; on the Team page to open leaderboards.
            </p>
            <Link
              href={ROUTES.clients}
              className="mt-4 inline-block text-sm font-medium text-[var(--vx-accent)] hover:underline"
            >
              ← Directory
            </Link>
          </div>
        ) : (
          <ClientLeaderboardsView
            data={data}
            loading={loading}
            error={error}
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
