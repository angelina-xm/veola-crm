"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useMembership } from "@/src/context/MembershipContext";
import { getClientCommercialAnalytics } from "@/src/lib/api";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import { canViewAnalytics } from "@/src/lib/roles";
import type { ClientCommercialAnalytics } from "@/src/types";

export function useClientCommercialAnalytics(productFilter: string) {
  const { membership, loading: membershipLoading } = useMembership();
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [data, setData] = useState<ClientCommercialAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(e instanceof Error ? e.message : "Failed to load client intelligence");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, membership, productFilter]);

  useEffect(() => {
    if (companyId === null || membershipLoading) return;
    void load();
  }, [companyId, membershipLoading, load]);

  return {
    data,
    loading,
    error,
    load,
    allowed: canViewAnalytics(membership),
    membershipLoading,
  };
}
