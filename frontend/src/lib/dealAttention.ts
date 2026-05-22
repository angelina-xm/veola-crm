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
    "vx-deal-card group relative border",
    "border-[var(--vx-border-subtle)]",
    visual === "healthy" && "hover:border-[var(--vx-border)]",
    visual === "hot" && "border-l-[3px] border-l-[var(--vx-accent)]/45 pl-[calc(1rem-3px)]",
    visual === "at_risk" && "border-l-[3px] border-l-amber-500/35 pl-[calc(1rem-3px)]",
    visual === "stale" && "opacity-[0.92]",
    opts?.dimmed && "opacity-30 saturate-[0.85]",
    opts?.spotlight && "ring-1 ring-[var(--vx-accent)]/30",
    opts?.dragging &&
      "scale-[1.015] shadow-[var(--vx-shadow-card-hover)] ring-1 ring-[var(--vx-accent)]/20 z-10"
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

export function dealHealthDotClass(visual: DealAttentionVisual): string {
  switch (visual) {
    case "hot":
      return "bg-[var(--vx-accent)]/70";
    case "at_risk":
      return "bg-amber-500/60";
    case "stale":
      return "bg-[var(--vx-text-muted)]/50";
    default:
      return "bg-transparent";
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
