import type { Activity, Deal } from "@/src/types";

export type AutoTaskData = {
  isStale: boolean;
  pricingCount: number;
  isDormant: boolean;
};

export type AutoTaskRule = {
  id: string;
  autoType: string;
  condition: (data: AutoTaskData) => boolean;
  content: string;
};

export type AutomationSettings = Record<string, boolean>;

export const AUTOMATION_SETTINGS_STORAGE_KEY = "automation:settings";

export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
  follow_up: true,
  pricing: true,
  reorder: true,
};

export const AUTO_TASK_RULES: AutoTaskRule[] = [
  {
    id: "follow_up",
    autoType: "follow_up",
    condition: (data) => data.isStale,
    content: "Follow up with client",
  },
  {
    id: "pricing",
    autoType: "offer_discount",
    condition: (data) => data.pricingCount >= 3,
    content: "Offer discount",
  },
  {
    id: "reorder",
    autoType: "reorder",
    condition: (data) => data.isDormant,
    content: "Suggest reorder",
  },
];

export function readAutomationSettings(): AutomationSettings {
  if (typeof window === "undefined") return { ...DEFAULT_AUTOMATION_SETTINGS };
  try {
    const raw = window.localStorage.getItem(AUTOMATION_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AUTOMATION_SETTINGS };
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return { ...DEFAULT_AUTOMATION_SETTINGS };
    }
    const safe = parsed as Record<string, unknown>;
    return {
      follow_up:
        typeof safe.follow_up === "boolean"
          ? safe.follow_up
          : DEFAULT_AUTOMATION_SETTINGS.follow_up,
      pricing:
        typeof safe.pricing === "boolean"
          ? safe.pricing
          : DEFAULT_AUTOMATION_SETTINGS.pricing,
      reorder:
        typeof safe.reorder === "boolean"
          ? safe.reorder
          : DEFAULT_AUTOMATION_SETTINGS.reorder,
    };
  } catch {
    return { ...DEFAULT_AUTOMATION_SETTINGS };
  }
}

export function saveAutomationSettings(settings: AutomationSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    AUTOMATION_SETTINGS_STORAGE_KEY,
    JSON.stringify(settings)
  );
}

export function hasAutoTask(
  deal: Deal,
  autoType: string,
  activities: Activity[]
): boolean {
  const dealId = String(deal.id);
  return activities.some(
    (a) =>
      a.type === "task" &&
      String(a.deal ?? "") === dealId &&
      String(a.auto_type ?? "").trim().toLowerCase() ===
        autoType.trim().toLowerCase()
  );
}

export function applyAutoTasks(
  deal: Deal,
  data: AutoTaskData,
  activities: Activity[],
  settings: AutomationSettings = readAutomationSettings()
): { autoType: string; content: string }[] {
  const out: { autoType: string; content: string }[] = [];
  for (const rule of AUTO_TASK_RULES) {
    if (!settings[rule.id]) continue;
    if (!rule.condition(data)) continue;
    if (hasAutoTask(deal, rule.autoType, activities)) continue;
    out.push({ autoType: rule.autoType, content: rule.content });
  }
  return out;
}
