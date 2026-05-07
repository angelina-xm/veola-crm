"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  AUTOMATION_SETTINGS_FALLBACK,
  getAutomationSettings,
  patchAutomationSettings,
} from "@/src/lib/api";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import type { AutomationSettings } from "@/src/lib/autoTaskRules";

type SettingsContextValue = {
  settings: AutomationSettings;
  loading: boolean;
  saving: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
  updateSettings: (patch: Partial<AutomationSettings>) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [settings, setSettings] = useState<AutomationSettings>(
    AUTOMATION_SETTINGS_FALLBACK
  );
  const [companyId, setCompanyId] = useState<number>(() => {
    return getStoredCompanyId() ?? readEnvCompanyId();
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    console.log("SettingsProvider mounted");
    console.log("[SettingsProvider] mount");
    return () => {
      console.log("SettingsProvider unmounted");
      console.log("[SettingsProvider] unmount");
    };
  }, []);

  useEffect(() => {
    console.log("[SettingsProvider] route change", pathname);
    const nextCompanyId = getStoredCompanyId() ?? readEnvCompanyId();
    setCompanyId((prev) => (prev !== nextCompanyId ? nextCompanyId : prev));
  }, [pathname]);

  const refreshSettings = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    console.log("[SettingsProvider] refresh start", { requestId, companyId });
    setLoading(true);
    setError(null);
    try {
      const data = await getAutomationSettings(companyId);
      console.log("FETCH SETTINGS RESULT", { requestId, companyId, data });
      if (requestId !== requestIdRef.current) {
        console.log("[SettingsProvider] stale fetch ignored", { requestId });
        return;
      }
      setSettings((prev) => {
        const next = { ...prev, ...data };
        console.log("SETTINGS BEFORE SET", prev);
        console.log("SETTINGS AFTER SET", next);
        return next;
      });
    } catch {
      if (requestId !== requestIdRef.current) return;
      console.log("FETCH SETTINGS RESULT", {
        requestId,
        companyId,
        data: AUTOMATION_SETTINGS_FALLBACK,
      });
      setSettings((prev) => {
        const next = { ...prev, ...AUTOMATION_SETTINGS_FALLBACK };
        console.log("SETTINGS BEFORE SET", prev);
        console.log("SETTINGS AFTER SET", next);
        return next;
      });
      setError("Failed to load settings. Using safe defaults.");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [companyId]);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

  const updateSettings = useCallback(
    async (patch: Partial<AutomationSettings>) => {
      setSaving(true);
      setError(null);
      let prevSnapshot: AutomationSettings | null = null;
      setSettings((prev) => {
        prevSnapshot = prev;
        const next = { ...prev, ...patch };
        console.log("SETTINGS BEFORE SET", prev);
        console.log("SETTINGS AFTER SET", next);
        return next;
      });
      try {
        const data = await patchAutomationSettings(companyId, patch);
        console.log("PATCH RESULT", data);
        setSettings((prev) => {
          const next = { ...prev, ...data };
          console.log("SETTINGS BEFORE SET", prev);
          console.log("SETTINGS AFTER SET", next);
          return next;
        });
      } catch (e) {
        if (prevSnapshot) {
          setSettings((prev) => {
            const next = { ...prev, ...prevSnapshot! };
            console.log("SETTINGS BEFORE SET", prev);
            console.log("SETTINGS AFTER SET", next);
            return next;
          });
        }
        setError("Failed to save setting. Please try again.");
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [companyId]
  );

  const value = useMemo(
    () => ({
      settings,
      loading,
      saving,
      error,
      refreshSettings,
      updateSettings,
    }),
    [settings, loading, saving, error, refreshSettings, updateSettings]
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within <SettingsProvider>");
  }
  return ctx;
}
