import type {
  ClientRelationshipStatus,
  RelationshipHealth,
} from "@/src/types";

export const CLIENT_RELATIONSHIP_STATUSES: {
  value: ClientRelationshipStatus;
  label: string;
}[] = [
  { value: "active", label: "Active" },
  { value: "vip", label: "VIP" },
  { value: "growing", label: "Growing" },
  { value: "returning", label: "Returning" },
  { value: "dormant", label: "Dormant" },
  { value: "at_risk", label: "At risk" },
  { value: "lost_momentum", label: "Lost momentum" },
  { value: "seasonal", label: "Seasonal" },
  { value: "high_potential", label: "High potential" },
];

export const HEALTH_CLASS: Record<RelationshipHealth, string> = {
  healthy: "bg-emerald-500/15 text-emerald-300",
  cooling_down: "bg-sky-500/15 text-sky-300",
  needs_attention: "bg-amber-500/15 text-amber-200",
  re_engagement: "bg-violet-500/15 text-violet-300",
};

export const STATUS_CLASS: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300",
  vip: "bg-violet-500/15 text-violet-300",
  growing: "bg-teal-500/15 text-teal-300",
  returning: "bg-sky-500/15 text-sky-300",
  dormant: "bg-zinc-500/20 text-zinc-400",
  at_risk: "bg-amber-500/15 text-amber-200",
  lost_momentum: "bg-orange-500/15 text-orange-300",
  seasonal: "bg-indigo-500/15 text-indigo-300",
  high_potential: "bg-fuchsia-500/15 text-fuchsia-300",
  prospect: "bg-emerald-500/15 text-emerald-300",
  churned: "bg-zinc-500/20 text-zinc-400",
};

export const SIGNAL_DOT: Record<string, string> = {
  attention: "bg-amber-500",
  info: "bg-sky-500",
  positive: "bg-emerald-500",
};

export function relationshipStatusLabel(status: string | undefined): string {
  const row = CLIENT_RELATIONSHIP_STATUSES.find((s) => s.value === status);
  if (row) return row.label;
  if (!status) return "Active";
  return status.replace(/_/g, " ");
}

export function relationshipHealthLabel(health: string | undefined): string {
  const map: Record<string, string> = {
    healthy: "Healthy",
    cooling_down: "Cooling down",
    needs_attention: "Needs attention",
    re_engagement: "Re-engagement opportunity",
  };
  if (!health) return "Healthy";
  return map[health] ?? health.replace(/_/g, " ");
}
