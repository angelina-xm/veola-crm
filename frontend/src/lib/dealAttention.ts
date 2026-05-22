import type { Deal } from "@/src/types";
import type { DealHealth } from "@/src/components/pipeline/DealCard";
import { cn } from "@/src/lib/cn";

export type DealAttentionVisual = "healthy" | "hot" | "at_risk" | "stale";

export function resolveDealAttentionVisual(
  health: DealHealth,
  needsAttention: boolean
): DealAttentionVisual {
  if (health === "urgent") return "hot";
  if (health === "at_risk") return "at_risk";
  if (needsAttention) return "stale";
  return "healthy";
}

export function dealCardShellClass(
  visual: DealAttentionVisual,
  opts?: { dragging?: boolean; dimmed?: boolean; spotlight?: boolean }
): string {
  return cn(
    "group relative rounded-xl border backdrop-blur-sm transition-all duration-200",
    "bg-[var(--vx-surface-raised)]/90",
    visual === "healthy" && "border-[var(--vx-border)] hover:border-[var(--vx-border-subtle)] hover:shadow-md",
    visual === "hot" &&
      "border-[var(--vx-accent)]/30 shadow-[0_0_0_1px_rgba(99,102,241,0.2),0_8px_24px_rgba(99,102,241,0.08)]",
    visual === "at_risk" &&
      "border-amber-500/25 shadow-[0_0_0_1px_rgba(245,158,11,0.15)]",
    visual === "stale" && "border-[var(--vx-border-subtle)] opacity-[0.88]",
    opts?.dimmed && "opacity-35 saturate-50",
    opts?.spotlight && "ring-2 ring-[var(--vx-accent)]/40 ring-offset-2 ring-offset-[var(--vx-bg)]",
    opts?.dragging && "scale-[1.02] shadow-xl ring-2 ring-[var(--vx-accent)]/25"
  );
}

export function dealHealthLabel(visual: DealAttentionVisual): string | null {
  switch (visual) {
    case "hot":
      return "Needs action";
    case "at_risk":
      return "At risk";
    case "stale":
      return "Quiet";
    default:
      return null;
  }
}

export function dealHealthChipClass(visual: DealAttentionVisual): string {
  switch (visual) {
    case "hot":
      return "bg-[var(--vx-accent-soft)] text-[var(--vx-accent)]";
    case "at_risk":
      return "vx-badge-warning";
    case "stale":
      return "vx-badge-neutral opacity-80";
    default:
      return "hidden";
  }
}

export function sumDealAmounts(deals: Deal[]): number {
  return deals.reduce((sum, d) => {
    const n =
      typeof d.amount === "number"
        ? d.amount
        : Number.parseFloat(String(d.amount ?? ""));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}
