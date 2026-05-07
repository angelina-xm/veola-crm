"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import AppNav from "@/src/components/navigation/AppNav";
import { patchAutomationSettings } from "@/src/lib/api";
import { useSettings } from "@/src/context/SettingsContext";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";

type RuleRow = {
  id: "auto_follow_up" | "auto_discount" | "auto_reorder";
  title: string;
  description: string;
};

const RULES: RuleRow[] = [
  {
    id: "auto_follow_up",
    title: "Follow up when deal is inactive",
    description: "Create task: Follow up with client",
  },
  {
    id: "auto_discount",
    title: "Offer discount when pricing objections",
    description: "Create task: Offer discount",
  },
  {
    id: "auto_reorder",
    title: "Suggest reorder for returning clients",
    description: "Create task: Suggest reorder",
  },
];

export default function AutomationSettingsPage() {
  const { settings, setSettings, loading, error: loadError } = useSettings();
  const [savingRuleId, setSavingRuleId] = useState<RuleRow["id"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enabledCount = useMemo(
    () => RULES.reduce((acc, row) => acc + (settings[row.id] ? 1 : 0), 0),
    [settings]
  );

  useEffect(() => {
    console.log("SETTINGS UPDATE", settings);
  }, [settings]);

  const toggleRule = async (id: RuleRow["id"]) => {
    const companyId = getStoredCompanyId() ?? readEnvCompanyId();
    const previous = settings[id];
    const optimistic = { ...settings, [id]: !previous };
    console.log("SETTINGS BEFORE SET", settings);
    setSettings(optimistic);
    setSavingRuleId(id);
    setError(null);
    try {
      const data = await patchAutomationSettings(companyId, {
        [id]: !previous,
      });
      console.log("PATCH RESULT", data);
      console.log("SETTINGS BEFORE SET", settings);
      setSettings((prev) => {
        const next = {
          ...prev,
          [id]: !previous,
        };
        console.log("SETTINGS AFTER SET", next);
        return next;
      });
    } catch {
      console.log("SETTINGS BEFORE SET", settings);
      setSettings((prev) => ({ ...prev, [id]: previous }));
      setError("Failed to save setting. Please try again.");
    } finally {
      setSavingRuleId(null);
    }
  };

  const resetDefaults = async () => {
    const companyId = getStoredCompanyId() ?? readEnvCompanyId();
    setError(null);
    setSavingRuleId("auto_follow_up");
    try {
      const data = await patchAutomationSettings(companyId, {
        auto_follow_up: true,
        auto_discount: true,
        auto_reorder: true,
      });
      console.log("PATCH RESULT", data);
      console.log("SETTINGS BEFORE SET", settings);
      setSettings((prev) => {
        const next = {
          ...prev,
          auto_follow_up: true,
          auto_discount: true,
          auto_reorder: true,
        };
        console.log("SETTINGS AFTER SET", next);
        return next;
      });
    } catch {
      setError("Failed to reset defaults.");
    } finally {
      setSavingRuleId(null);
    }
  };

  return (
    <ProtectedRoute>
      <div className="p-6">
        <AppNav />
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Automation Settings</h1>
            <p className="mt-1 text-gray-600">
              Manage which automation rules can create tasks.
            </p>
          </div>
          <button
            type="button"
            onClick={resetDefaults}
            disabled={loading || savingRuleId !== null}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Reset defaults
          </button>
        </div>
        {(error ?? loadError) ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error ?? loadError}
          </div>
        ) : null}

        <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          Enabled rules: {enabledCount}/{RULES.length}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <ul className="divide-y divide-gray-100">
            {RULES.map((rule) => (
              <li
                key={rule.id}
                className="flex items-center justify-between gap-3 px-4 py-4"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{rule.title}</p>
                  <p className="mt-1 text-xs text-gray-500">{rule.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings[rule.id]}
                  onClick={() => void toggleRule(rule.id)}
                  disabled={loading || savingRuleId !== null}
                  className={`inline-flex h-7 w-14 items-center rounded-full p-1 transition ${
                    settings[rule.id] ? "bg-indigo-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white shadow transition ${
                      settings[rule.id] ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ProtectedRoute>
  );
}
