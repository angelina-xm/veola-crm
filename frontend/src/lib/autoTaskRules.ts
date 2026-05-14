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

export type AutomationSettings = {
  auto_follow_up: boolean;
  auto_discount: boolean;
  auto_reorder: boolean;
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

function isRuleEnabled(ruleId: string, settings: AutomationSettings): boolean {
  if (ruleId === "follow_up") return settings.auto_follow_up;
  if (ruleId === "pricing") return settings.auto_discount;
  if (ruleId === "reorder") return settings.auto_reorder;
  return true;
}

export function hasAutoTask(
  deal: Deal,
  autoType: string,
  activities: Activity[]
): boolean {
  const dealId = String(deal.id);
  const norm = (s: string) => s.trim().toLowerCase();
  const at = norm(autoType);
  const rule = AUTO_TASK_RULES.find(
    (r) => norm(r.autoType) === at
  );
  const ruleContentNorm = rule ? norm(rule.content) : null;

  return activities.some((a) => {
    if (a.type !== "task" || String(a.deal ?? "") !== dealId) return false;
    if (a.auto_type && norm(String(a.auto_type)) === at) return true;
    if (
      ruleContentNorm &&
      a.content &&
      norm(String(a.content)) === ruleContentNorm
    ) {
      return true;
    }
    return false;
  });
}

export function applyAutoTasks(
  deal: Deal,
  data: AutoTaskData,
  activities: Activity[],
  settings: AutomationSettings
): { autoType: string; content: string }[] {
  const out: { autoType: string; content: string }[] = [];
  for (const rule of AUTO_TASK_RULES) {
    if (!isRuleEnabled(rule.id, settings)) continue;
    if (!rule.condition(data)) continue;
    if (hasAutoTask(deal, rule.autoType, activities)) continue;
    out.push({ autoType: rule.autoType, content: rule.content });
  }
  return out;
}
