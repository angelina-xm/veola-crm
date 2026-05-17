"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import AppNav from "@/src/components/navigation/AppNav";
import { useMembership } from "@/src/context/MembershipContext";
import { useSettings } from "@/src/context/SettingsContext";
import { canManageAutomations } from "@/src/lib/roles";

type RuleRow = {
  id: "auto_follow_up" | "auto_discount" | "auto_reorder";
  title: string;
  description: string;
};

const RULES: RuleRow[] = [
  {
    id: "auto_follow_up",
    title: "Follow up when deal is inactive (5+ days)",
    description:
      "When on, creates one follow-up task at tier 2. When off, calm signals only.",
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
  const {
    settings,
    loading,
    saving,
    error: loadError,
    updateSettings,
  } = useSettings();
  const { membership, loading: roleLoading } = useMembership();
  const [savingRuleId, setSavingRuleId] = useState<RuleRow["id"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("[AutomationSettingsPage] mount");
    return () => {
      console.log("[AutomationSettingsPage] unmount");
    };
  }, []);

  const enabledCount = useMemo(
    () => RULES.reduce((acc, row) => acc + (settings[row.id] ? 1 : 0), 0),
    [settings]
  );

  useEffect(() => {
    console.log("SETTINGS UPDATE", settings);
  }, [settings]);

  const toggleRule = async (id: RuleRow["id"]) => {
    if (!canManageAutomations(membership)) return;
    const previous = settings[id];
    setSavingRuleId(id);
    setError(null);
    try {
      await updateSettings({
        [id]: !previous,
      });
    } catch {
      setError("Failed to save setting. Please try again.");
    } finally {
      setSavingRuleId(null);
    }
  };

  const resetDefaults = async () => {
    if (!canManageAutomations(membership)) return;
    setError(null);
    setSavingRuleId("auto_follow_up");
    try {
      await updateSettings({
        auto_follow_up: true,
        auto_discount: true,
        auto_reorder: true,
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
            disabled={
              roleLoading ||
              !canManageAutomations(membership) ||
              loading ||
              saving ||
              savingRuleId !== null
            }
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Reset defaults
          </button>
        </div>
        {!roleLoading && !canManageAutomations(membership) ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            You don&apos;t have permission to manage automation settings.
          </div>
        ) : null}
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
                  disabled={
                    roleLoading ||
                    !canManageAutomations(membership) ||
                    loading ||
                    saving ||
                    savingRuleId !== null
                  }
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
