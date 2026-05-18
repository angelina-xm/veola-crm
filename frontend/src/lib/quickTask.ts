import { createCrmTask } from "@/src/lib/api";
import { getStoredCompanyId } from "@/src/lib/auth";

/** Следующий календарный день, полдень локально → ISO для due_date. */
export function tomorrowDueDateIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

/** Полдень через `days` календарных дней от сегодня (локально). */
export function dueInDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export type TaskPreset =
  | "call_client"
  | "send_proposal"
  | "schedule_meeting"
  | "custom";

function parseDealId(dealId: string | number): number {
  const dealNum =
    typeof dealId === "number"
      ? dealId
      : Number.parseInt(String(dealId), 10);
  if (!Number.isFinite(dealNum)) {
    throw new Error("Некорректный id сделки");
  }
  return dealNum;
}

/**
 * Создаёт задачу по пресету на сделке (POST /tasks/).
 */
export async function createTaskFromPreset(
  companyId: number,
  dealId: string | number,
  preset: TaskPreset,
  customContent?: string,
  opts?: { assignedToUserId?: number }
): Promise<void> {
  const tenantId = getStoredCompanyId() ?? companyId;
  const dealNum = parseDealId(dealId);

  let content: string;
  let due_date: string;

  switch (preset) {
    case "call_client":
      content = "Call client";
      due_date = tomorrowDueDateIso();
      break;
    case "send_proposal":
      content = "Send proposal";
      due_date = dueInDaysIso(2);
      break;
    case "schedule_meeting":
      content = "Schedule meeting";
      due_date = dueInDaysIso(1);
      break;
    case "custom": {
      const trimmed = (customContent ?? "").trim();
      if (!trimmed) {
        throw new Error("Укажите текст задачи");
      }
      content = trimmed;
      due_date = tomorrowDueDateIso();
      break;
    }
  }

  await createCrmTask(tenantId, {
    deal: dealNum,
    content,
    due_date,
    priority: "medium",
    assigned_to: opts?.assignedToUserId,
  });
}
