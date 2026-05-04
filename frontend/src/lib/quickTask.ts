import { createActivity } from "@/src/lib/api";
import { getStoredCompanyId } from "@/src/lib/auth";
import type { Activity } from "@/src/types";

/** Следующий календарный день, полдень локально → ISO для due_date. */
export function tomorrowDueDateIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

/**
 * Одним кликом создаёт открытую задачу по сделке (без формы).
 * tenant для заголовка — как в остальных запросах (LS → явный companyId).
 */
export async function createQuickTask(
  companyId: number,
  dealId: string | number
): Promise<Activity> {
  const tenantId = getStoredCompanyId() ?? companyId;
  const dealNum =
    typeof dealId === "number"
      ? dealId
      : Number.parseInt(String(dealId), 10);
  if (!Number.isFinite(dealNum)) {
    throw new Error("Некорректный id сделки");
  }
  return createActivity(tenantId, {
    deal: dealNum,
    type: "task",
    content: "Follow up",
    due_date: tomorrowDueDateIso(),
  });
}
