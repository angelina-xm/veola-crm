"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useBilling } from "@/src/hooks/useBilling";
import { useMembership } from "@/src/context/MembershipContext";
import { getClientCommercialAnalytics } from "@/src/lib/api";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import { canViewAnalytics } from "@/src/lib/roles";
import type { ClientCommercialAnalytics } from "@/src/types";

export function useClientCommercialAnalytics(productFilter: string) {
  const { membership, loading: membershipLoading } = useMembership();
  const { isLocked } = useBilling();
  const roleAllowed = canViewAnalytics(membership);
  const proLocked = isLocked("clientDeepAnalytics");
  const intelligenceUnlocked = roleAllowed && !proLocked;
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [data, setData] = useState<ClientCommercialAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, []);

  const load = useCallback(async () => {
    if (!intelligenceUnlocked || companyId === null) return;
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
  }, [companyId, intelligenceUnlocked, productFilter]);

  useEffect(() => {
    if (companyId === null || membershipLoading || !intelligenceUnlocked) return;
    void load();
  }, [companyId, membershipLoading, intelligenceUnlocked, load]);

  return {
    data,
    loading,
    error,
    load,
    allowed: roleAllowed,
    intelligenceUnlocked,
    proLocked,
    membershipLoading,
  };
}
