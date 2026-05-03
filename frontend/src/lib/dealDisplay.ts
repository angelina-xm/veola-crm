import type { Client } from "@/src/types";

/** Календарные дни между двумя датами (локальная полуночь). */
function calendarDaysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Дата создания сделки: "Today" | "Yesterday" | "N days ago".
 */
export function formatCreatedRelative(iso: string | undefined): string {
  if (!iso) return "—";
  const created = new Date(iso);
  if (!Number.isFinite(created.getTime())) return "—";
  const now = new Date();
  const days = calendarDaysBetween(created, now);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function formatDealIdLabel(id: string | number): string {
  return `#${id}`;
}

/** Сумма сделки для карточки (USD, целые). */
export function formatDealAmountUsd(
  amount?: number | string | null
): string | null {
  if (amount === undefined || amount === null || amount === "") return null;
  const n =
    typeof amount === "number" ? amount : Number.parseFloat(String(amount));
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function clientNameById(
  clients: Client[],
  clientId?: string | number
): string | undefined {
  if (clientId == null || clientId === "") return undefined;
  const c = clients.find((x) => String(x.id) === String(clientId));
  return c?.name;
}
