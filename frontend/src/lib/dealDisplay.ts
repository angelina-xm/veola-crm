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
  return clientById(clients, clientId)?.name;
}

export function clientById(
  clients: Client[],
  clientId?: string | number
): Client | undefined {
  if (clientId == null || clientId === "") return undefined;
  return clients.find((x) => String(x.id) === String(clientId));
}

/** Short relative time for card footers — "2h ago", "Yesterday", "15d". */
export function formatActivityShort(iso: string | undefined | null): string {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "—";
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days}d ago`;
  return formatCreatedRelative(iso);
}

/** Days in current stage proxy (uses created_at until stage_entered exists). */
export function daysInStage(createdAt?: string): number | null {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  if (!Number.isFinite(created.getTime())) return null;
  return Math.max(0, calendarDaysBetween(created, new Date()));
}

/** Optional stage-weighted probability for display only. */
export function inferStageProbability(stageName?: string | null): number | null {
  const s = String(stageName ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s.includes("qualif") || s === "new") return 20;
  if (s.includes("discover")) return 35;
  if (s.includes("propos")) return 55;
  if (s.includes("negoti")) return 75;
  if (s.includes("won") || s.includes("closed")) return 100;
  return 40;
}

export function assigneeLabel(
  email?: string | null,
  fallback = "Unassigned"
): string {
  if (!email) return fallback;
  const local = email.split("@")[0] ?? email;
  return local.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
