/** Session key: pipeline Board opens this deal after navigation from other pages. */
export const OPEN_DEAL_SESSION_KEY = "vexora_open_deal_id";

export function queueOpenDealOnPipeline(dealId: string | number): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(OPEN_DEAL_SESSION_KEY, String(dealId));
}
