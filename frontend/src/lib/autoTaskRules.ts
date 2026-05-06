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

export const AUTO_TASK_RULES: AutoTaskRule[] = [
  {
    id: "stale",
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
  activities: Activity[]
): { autoType: string; content: string }[] {
  const out: { autoType: string; content: string }[] = [];
  for (const rule of AUTO_TASK_RULES) {
    if (!rule.condition(data)) continue;
    if (hasAutoTask(deal, rule.autoType, activities)) continue;
    out.push({ autoType: rule.autoType, content: rule.content });
  }
  return out;
}
