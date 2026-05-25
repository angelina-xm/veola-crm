"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import ClientIntelligenceGate from "@/src/components/clients/ClientIntelligenceGate";
import ClientSectionNav from "@/src/components/clients/ClientSectionNav";
import ClientAnalyticsView from "@/src/components/clients/analytics/ClientAnalyticsView";
import PageHeader from "@/src/components/ui/PageHeader";
import { useClientCommercialAnalytics } from "@/src/hooks/useClientCommercialAnalytics";
import { useTranslation } from "@/src/context/LocaleContext";

export default function ClientAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-sm text-zinc-500">…</div>
      }
    >
      <ClientAnalyticsPageContent />
    </Suspense>
  );
}

function ClientAnalyticsPageContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const highlightClientId = searchParams.get("highlight");
  const { data, loading, error, load } = useClientCommercialAnalytics("");

  return (
    <ProtectedRoute>
      <div className="space-y-6 pb-10">
        <ClientSectionNav />
        <PageHeader
          eyebrow={t("clients.intelligenceEyebrow")}
          title={t("nav.clientAnalytics")}
          description={t("clients.intelligenceDescription")}
        />

        <ClientIntelligenceGate
          title={t("nav.clientAnalytics")}
          description={t("clients.intelligencePortfolio")}
        >
          <ClientAnalyticsView
            data={data}
            loading={loading}
            error={error}
            highlightClientId={highlightClientId}
            onRetry={() => void load()}
          />
        </ClientIntelligenceGate>
      </div>
    </ProtectedRoute>
  );
}
