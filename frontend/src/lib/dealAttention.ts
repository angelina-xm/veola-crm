import { translate } from "@/src/i18n/translate";
import type { Deal } from "@/src/types";
import type { DealHealth } from "@/src/components/pipeline/DealCard";
import { cn } from "@/src/lib/cn";

export type DealAttentionVisual =
  | "healthy"
  | "hot"
  | "at_risk"
  | "stale"
  | "closing";

export function resolveDealAttentionVisual(
  health: DealHealth,
  needsAttention: boolean,
  closingSoon = false
): DealAttentionVisual {
  if (closingSoon && health === "cold") return "closing";
  if (health === "urgent") return "hot";
  if (health === "at_risk") return "at_risk";
  if (needsAttention) return "stale";
  if (closingSoon) return "closing";
  return "healthy";
}

export function dealCardShellClass(
  visual: DealAttentionVisual,
  opts?: { dragging?: boolean; dimmed?: boolean; spotlight?: boolean }
): string {
  return cn(
    "vx-deal-card group relative overflow-hidden rounded-xl border",
    "border-[var(--vx-deals-card-border)] bg-[var(--vx-deals-card-bg)]",
    "shadow-[var(--vx-deals-card-shadow)]",
    "backdrop-blur-sm",
    visual === "healthy" &&
      "hover:border-[var(--vx-border)] hover:shadow-[var(--vx-deals-card-shadow-hover)] hover:-translate-y-px",
    visual === "hot" && "vx-deal-edge vx-deal-edge--hot",
    visual === "at_risk" && "vx-deal-edge vx-deal-edge--risk",
    visual === "stale" && "vx-deal-edge vx-deal-edge--stale",
    visual === "closing" && "vx-deal-edge vx-deal-edge--closing",
    opts?.dimmed && "opacity-[0.28] saturate-[0.7] pointer-events-none",
    opts?.spotlight && "ring-1 ring-[var(--vx-accent)]/35 shadow-[var(--vx-shadow-card-hover)]",
    opts?.dragging && "opacity-[0.35] scale-[0.98] shadow-none ring-0"
  );
}

export type DealStatusBadge = {
  label: string;
  tone: "neutral" | "warn" | "risk" | "closing" | "positive";
};

export function dealStatusBadges(input: {
  visual: DealAttentionVisual;
  isOverdue: boolean;
  daysIdle: number | null;
  nextTaskContent?: string;
  relationshipLabel?: string | null;
}): DealStatusBadge[] {
  const out: DealStatusBadge[] = [];
  if (input.relationshipLabel) {
    out.push({ label: input.relationshipLabel, tone: "neutral" });
  }
  if (input.isOverdue) {
    out.push({ label: translate("pipeline.badgeFollowUpOverdue"), tone: "warn" });
  } else if (input.visual === "hot") {
    out.push({ label: translate("pipeline.badgeNeedsAction"), tone: "warn" });
  } else if (input.visual === "at_risk") {
    out.push({
      label:
        input.daysIdle != null && input.daysIdle >= 14
          ? translate("pipeline.badgeNoReply", { count: input.daysIdle })
          : translate("pipeline.badgeAtRisk"),
      tone: "risk",
    });
  } else if (input.visual === "stale") {
    out.push({
      label:
        input.daysIdle != null
          ? translate("pipeline.badgeStalled", { count: input.daysIdle })
          : translate("pipeline.badgeNeedsAttention"),
      tone: "warn",
    });
  } else if (input.visual === "closing") {
    out.push({ label: translate("pipeline.badgeClosingSoon"), tone: "closing" });
  }
  return out.slice(0, 2);
}

export function dealHealthLabel(visual: DealAttentionVisual): string | null {
  switch (visual) {
    case "hot":
      return translate("pipeline.healthNeedsAction");
    case "at_risk":
      return translate("pipeline.healthAtRisk");
    case "stale":
      return translate("pipeline.healthQuiet");
    case "closing":
      return translate("pipeline.healthClosing");
    default:
      return null;
  }
}

export function dealHealthDotClass(visual: DealAttentionVisual): string {
  switch (visual) {
    case "hot":
      return "bg-amber-400/80";
    case "at_risk":
      return "bg-rose-400/70";
    case "stale":
      return "bg-[var(--vx-text-muted)]/50";
    case "closing":
      return "bg-violet-400/70";
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
