"use client";

import { useState } from "react";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import ClientIntelligenceGate from "@/src/components/clients/ClientIntelligenceGate";
import ClientSectionNav from "@/src/components/clients/ClientSectionNav";
import ClientLeaderboardsView from "@/src/components/clients/analytics/ClientLeaderboardsView";
import PageHeader from "@/src/components/ui/PageHeader";
import { useClientCommercialAnalytics } from "@/src/hooks/useClientCommercialAnalytics";
import { useTranslation } from "@/src/context/LocaleContext";

export default function ClientLeaderboardsPage() {
  const { t } = useTranslation();
  const [productFilter, setProductFilter] = useState("");
  const { data, loading, error, load } = useClientCommercialAnalytics(productFilter);

  return (
    <ProtectedRoute>
      <div className="space-y-6 pb-10">
        <ClientSectionNav />
        <PageHeader
          eyebrow={t("clients.intelligenceEyebrow")}
          title={t("nav.clientLeaderboards")}
          description={t("clients.leaderboardsDescription")}
        />

        <ClientIntelligenceGate
          title={t("nav.clientLeaderboards")}
          description={t("clients.leaderboardsPortfolio")}
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
