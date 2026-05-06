"use client";

import { useMemo, useState } from "react";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import AppNav from "@/src/components/navigation/AppNav";
import {
  DEFAULT_AUTOMATION_SETTINGS,
  readAutomationSettings,
  saveAutomationSettings,
  type AutomationSettings,
} from "@/src/lib/autoTaskRules";

type RuleRow = {
  id: keyof AutomationSettings;
  title: string;
  description: string;
};

const RULES: RuleRow[] = [
  {
    id: "follow_up",
    title: "Follow up when deal is inactive",
    description: "Create task: Follow up with client",
  },
  {
    id: "pricing",
    title: "Offer discount when pricing objections",
    description: "Create task: Offer discount",
  },
  {
    id: "reorder",
    title: "Suggest reorder for returning clients",
    description: "Create task: Suggest reorder",
  },
];

export default function AutomationSettingsPage() {
  const [settings, setSettings] = useState<AutomationSettings>(() =>
    readAutomationSettings()
  );

  const enabledCount = useMemo(
    () => RULES.reduce((acc, row) => acc + (settings[row.id] ? 1 : 0), 0),
    [settings]
  );

  const toggleRule = (id: keyof AutomationSettings) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        [id]: !prev[id],
      };
      saveAutomationSettings(next);
      return next;
    });
  };

  const resetDefaults = () => {
    const next = { ...DEFAULT_AUTOMATION_SETTINGS };
    setSettings(next);
    saveAutomationSettings(next);
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
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Reset defaults
          </button>
        </div>

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
                  onClick={() => toggleRule(rule.id)}
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
