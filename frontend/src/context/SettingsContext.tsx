"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  AUTOMATION_SETTINGS_FALLBACK,
  getAutomationSettings,
} from "@/src/lib/api";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import type { AutomationSettings } from "@/src/lib/autoTaskRules";

type SettingsContextValue = {
  settings: AutomationSettings;
  setSettings: Dispatch<SetStateAction<AutomationSettings>>;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AutomationSettings>(
    AUTOMATION_SETTINGS_FALLBACK
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLoaded = useRef(false);

  const refreshSettings = useCallback(async () => {
    const companyId = getStoredCompanyId() ?? readEnvCompanyId();
    setLoading(true);
    setError(null);
    try {
      const next = await getAutomationSettings(companyId);
      console.log("FETCH SETTINGS RESULT", next);
      console.log("SETTINGS BEFORE SET", settings);
      setSettings((prev) => {
        const merged = { ...prev, ...next };
        console.log("SETTINGS AFTER SET", merged);
        return merged;
      });
    } catch {
      console.log("FETCH SETTINGS RESULT", AUTOMATION_SETTINGS_FALLBACK);
      console.log("SETTINGS BEFORE SET", settings);
      setSettings((prev) => {
        const next = { ...prev, ...AUTOMATION_SETTINGS_FALLBACK };
        console.log("SETTINGS AFTER SET", next);
        return next;
      });
      setError("Failed to load settings. Using safe defaults.");
    } finally {
      setLoading(false);
    }
  }, [settings]);

  useEffect(() => {
    if (isLoaded.current) return;
    isLoaded.current = true;
    void refreshSettings();
  }, [refreshSettings]);

  const value = useMemo(
    () => ({ settings, setSettings, loading, error, refreshSettings }),
    [settings, loading, error, refreshSettings]
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
