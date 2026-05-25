"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import PageHeader from "@/src/components/ui/PageHeader";
import { useMembership } from "@/src/context/MembershipContext";
import { useSettings } from "@/src/context/SettingsContext";
import { canManageAutomations } from "@/src/lib/roles";
import { useTranslation } from "@/src/context/LocaleContext";

type RuleRow = {
  id: "auto_follow_up" | "auto_discount" | "auto_reorder";
  titleKey: string;
  descriptionKey: string;
};

const RULES: RuleRow[] = [
  {
    id: "auto_follow_up",
    titleKey: "automation.ruleInactive",
    descriptionKey: "automation.ruleInactiveHint",
  },
  {
    id: "auto_discount",
    titleKey: "automation.ruleDiscount",
    descriptionKey: "automation.ruleDiscountHint",
  },
  {
    id: "auto_reorder",
    titleKey: "automation.ruleReorder",
    descriptionKey: "automation.ruleReorderHint",
  },
];

export default function AutomationSettingsPage() {
  const { t } = useTranslation();
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
      setError(t("settings.failedSave"));
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
      setError(t("automation.resetFailed"));
    } finally {
      setSavingRuleId(null);
    }
  };

  return (
    <ProtectedRoute>
      <>
        <PageHeader
          eyebrow={t("nav.workspace")}
          title={t("settings.automationTitle")}
          description={t("automation.pageDescription")}
          actions={
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
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              {t("automation.resetDefaults")}
            </button>
          }
        />
        {!roleLoading && !canManageAutomations(membership) ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t("automation.noPermission")}
          </div>
        ) : null}
        {(error ?? loadError) ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error ?? loadError}
          </div>
        ) : null}

        <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          {t("automation.enabledRules", {
            enabled: enabledCount,
            total: RULES.length,
          })}
        </div>

        <div className="vx-card overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {RULES.map((rule) => (
              <li
                key={rule.id}
                className="flex items-center justify-between gap-3 px-4 py-4"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{t(rule.titleKey)}</p>
                  <p className="mt-1 text-xs text-gray-500">{t(rule.descriptionKey)}</p>
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
      </>
    </ProtectedRoute>
  );
}
