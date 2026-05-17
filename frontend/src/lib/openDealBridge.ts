/** Session key: deals board opens this deal after navigation from other pages. */
export const OPEN_DEAL_SESSION_KEY = "vexora_open_deal_id";

/** Queue a deal to open on the Deals board after navigation. */
export function queueOpenDeal(dealId: string | number): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(OPEN_DEAL_SESSION_KEY, String(dealId));
}

/** @deprecated Use queueOpenDeal */
export const queueOpenDealOnPipeline = queueOpenDeal;
