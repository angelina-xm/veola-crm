"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/components/auth/AuthProvider";
import { getCurrentMembership } from "@/src/lib/api";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import type { CompanyRole, MembershipProfile } from "@/src/lib/roles";

type MembershipContextValue = {
  membership: MembershipProfile | null;
  role: CompanyRole | null;
  loading: boolean;
  error: string | null;
  refreshMembership: () => Promise<void>;
};

const MembershipContext = createContext<MembershipContextValue | undefined>(
  undefined
);

export function MembershipProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isReady, isAuthenticated } = useAuth();
  const [membership, setMembership] = useState<MembershipProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshMembership = useCallback(async () => {
    if (!isReady || !isAuthenticated) {
      setMembership(null);
      setLoading(false);
      setError(null);
      return;
    }
    const companyId = getStoredCompanyId() ?? readEnvCompanyId();
    setLoading(true);
    setError(null);
    try {
      const data = await getCurrentMembership(companyId);
      setMembership(data);
    } catch (e) {
      setMembership(null);
      setError(e instanceof Error ? e.message : "Failed to load membership");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isReady]);

  useEffect(() => {
    void refreshMembership();
  }, [refreshMembership, pathname]);

  const value = useMemo(
    () => ({
      membership,
      role: membership?.role ?? null,
      loading,
      error,
      refreshMembership,
    }),
    [membership, loading, error, refreshMembership]
  );

  return (
    <MembershipContext.Provider value={value}>
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership(): MembershipContextValue {
  const ctx = useContext(MembershipContext);
  if (!ctx) {
    throw new Error("useMembership must be used within <MembershipProvider>");
  }
  return ctx;
}
