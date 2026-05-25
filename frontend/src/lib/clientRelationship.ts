import { translate } from "@/src/i18n/translate";
import type {
  ClientRelationshipStatus,
  RelationshipHealth,
} from "@/src/types";

const STATUS_KEYS: Record<ClientRelationshipStatus, string> = {
  active: "clients.statusActive",
  vip: "clients.statusVip",
  growing: "clients.statusGrowing",
  returning: "clients.statusReturning",
  dormant: "clients.statusDormant",
  at_risk: "clients.statusAtRisk",
  lost_momentum: "clients.statusLostMomentum",
  seasonal: "clients.statusSeasonal",
  high_potential: "clients.statusHighPotential",
};

export const CLIENT_RELATIONSHIP_STATUSES: {
  value: ClientRelationshipStatus;
  label: string;
}[] = (
  Object.entries(STATUS_KEYS) as [ClientRelationshipStatus, string][]
).map(([value, key]) => ({
  value,
  label: translate(key),
}));

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
  const key = STATUS_KEYS[status as ClientRelationshipStatus];
  if (key) return translate(key);
  if (!status) return translate("clients.statusActive");
  return status.replace(/_/g, " ");
}

export function relationshipHealthLabel(health: string | undefined): string {
  const map: Record<string, string> = {
    healthy: "clients.healthHealthy",
    cooling_down: "clients.healthCooling",
    needs_attention: "clients.healthNeedsAttention",
    re_engagement: "clients.healthReEngagement",
  };
  if (!health) return translate("clients.healthHealthy");
  const key = map[health];
  return key ? translate(key) : health.replace(/_/g, " ");
}

/** Rebuild status list when locale changes (call from components via useMemo). */
export function getClientRelationshipStatuses() {
  return (Object.entries(STATUS_KEYS) as [ClientRelationshipStatus, string][]).map(
    ([value, key]) => ({
      value,
      label: translate(key),
    })
  );
}
