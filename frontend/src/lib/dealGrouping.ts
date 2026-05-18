import { Deal, DealsByStage } from "@/src/types";

/** Нормализует сделку из ответа API (id, stage, amount). */
export function normalizeDealPayload(deal: {
  id: string | number;
  title: string;
  stage?: string | number | null;
  amount?: string | number;
  client?: string | number | null;
  created_at?: string;
  assigned_to?: string | number | null;
  assigned_to_email?: string | null;
}): Deal {
  const stageVal = deal.stage != null ? String(deal.stage) : "";
  const rawAmount = deal.amount;
  const amount =
    rawAmount === undefined || rawAmount === null
      ? undefined
      : typeof rawAmount === "string"
        ? Number.parseFloat(rawAmount)
        : Number(rawAmount);

  const out: Deal = {
    id: String(deal.id),
    title: deal.title,
    stage: stageVal,
    stageId: stageVal,
    amount: Number.isFinite(amount) ? amount : undefined,
    client: deal.client != null ? deal.client : undefined,
  };
  const created = deal.created_at;
  if (created != null && String(created).trim() !== "") {
    out.created_at = String(created);
  }
  if (deal.assigned_to != null && deal.assigned_to !== "") {
    const aid = Number(deal.assigned_to);
    if (Number.isFinite(aid)) out.assigned_to = aid;
  }
  if (deal.assigned_to_email) {
    out.assigned_to_email = String(deal.assigned_to_email);
  }
  return out;
}

/** Убирает сделку из всех колонок и вставляет в колонку `stage`. */
export function upsertDealInGrouped(
  grouped: DealsByStage,
  deal: Deal
): DealsByStage {
  const stageKey = String(deal.stageId ?? deal.stage);
  const id = String(deal.id);
  const next: DealsByStage = {};
  for (const [k, list] of Object.entries(grouped)) {
    next[k] = list.filter((d) => String(d.id) !== id);
  }
  const list = [...(next[stageKey] ?? [])];
  list.push({ ...deal, stage: stageKey, stageId: stageKey });
  next[stageKey] = list;
  return next;
}

export function removeDealFromGrouped(
  grouped: DealsByStage,
  dealId: string
): DealsByStage {
  const next: DealsByStage = {};
  for (const [k, list] of Object.entries(grouped)) {
    next[k] = list.filter((d) => String(d.id) !== dealId);
  }
  return next;
}
