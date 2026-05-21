import type { ClientRelationshipStatus } from "@/src/types";

export const CLIENT_RELATIONSHIP_STATUSES: {
  value: ClientRelationshipStatus;
  label: string;
}[] = [
  { value: "active", label: "Active" },
  { value: "vip", label: "VIP" },
  { value: "at_risk", label: "At risk" },
  { value: "dormant", label: "Dormant" },
  { value: "returning", label: "Returning" },
];

export const STATUS_CLASS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  vip: "bg-violet-50 text-violet-700",
  at_risk: "bg-amber-50 text-amber-900",
  dormant: "bg-zinc-100 text-zinc-600",
  returning: "bg-sky-50 text-sky-800",
  prospect: "bg-emerald-50 text-emerald-700",
  churned: "bg-zinc-100 text-zinc-600",
};

export function relationshipStatusLabel(status: string | undefined): string {
  const row = CLIENT_RELATIONSHIP_STATUSES.find((s) => s.value === status);
  if (row) return row.label;
  if (!status) return "Active";
  return status.replace(/_/g, " ");
}
