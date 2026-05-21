"use client";

import { useState } from "react";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import ClientIntelligenceGate from "@/src/components/clients/ClientIntelligenceGate";
import ClientSectionNav from "@/src/components/clients/ClientSectionNav";
import ClientLeaderboardsView from "@/src/components/clients/analytics/ClientLeaderboardsView";
import PageHeader from "@/src/components/ui/PageHeader";
import { useClientCommercialAnalytics } from "@/src/hooks/useClientCommercialAnalytics";
import { NAV_LABELS } from "@/src/lib/product";

export default function ClientLeaderboardsPage() {
  const [productFilter, setProductFilter] = useState("");
  const { data, loading, error, load } = useClientCommercialAnalytics(productFilter);

  return (
    <ProtectedRoute>
      <div className="space-y-6 pb-10">
        <ClientSectionNav />
        <PageHeader
          eyebrow="Client intelligence"
          title={NAV_LABELS.clientLeaderboards}
          description="Top buyers, growth leaders, and product-specific rankings."
        />

        <ClientIntelligenceGate
          title={NAV_LABELS.clientLeaderboards}
          description="Commercial leaderboards across your client portfolio"
        >
          <ClientLeaderboardsView
            data={data}
            loading={loading}
            error={error}
            productFilter={productFilter}
            onProductFilter={setProductFilter}
            onClearFilters={() => setProductFilter("")}
            onRetry={() => void load()}
          />
        </ClientIntelligenceGate>
      </div>
    </ProtectedRoute>
  );
}
