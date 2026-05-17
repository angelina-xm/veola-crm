import { groupDealsByStage } from "@/src/lib/api";
import type { Deal, DealsByStage, PipelineStage } from "@/src/types";

export type CloseOutcome = "won" | "lost";

const CLOSED_NAMES = new Set(["won", "lost", "closed"]);

export function isClosedStageName(name: string): boolean {
  return CLOSED_NAMES.has(name.trim().toLowerCase());
}

export function partitionPipelineStages(stages: PipelineStage[]) {
  const operationalStages: PipelineStage[] = [];
  let wonStage: PipelineStage | undefined;
  let lostStage: PipelineStage | undefined;

  for (const stage of stages) {
    const key = stage.name.trim().toLowerCase();
    if (key === "won") wonStage = stage;
    else if (key === "lost") lostStage = stage;
    else if (key === "closed") {
      if (!wonStage) wonStage = stage;
    } else {
      operationalStages.push(stage);
    }
  }

  operationalStages.sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.id).localeCompare(String(b.id))
  );

  return { operationalStages, wonStage, lostStage };
}

/** Only operational deals appear in kanban columns. */
export function groupOperationalDeals(
  deals: Deal[],
  operationalStages: PipelineStage[]
): DealsByStage {
  const operationalIds = new Set(operationalStages.map((s) => String(s.id)));
  const active = deals.filter((d) => {
    const sid = String(d.stage ?? d.stageId ?? "");
    return operationalIds.has(sid);
  });
  return groupDealsByStage(active, operationalStages);
}

export function dealCycleDays(deal: Deal, now: number = Date.now()): number {
  if (!deal.created_at) return 0;
  const start = new Date(deal.created_at).getTime();
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, Math.floor((now - start) / (24 * 60 * 60 * 1000)));
}

export const CLOSE_ZONE_WON = "close-zone:won";
export const CLOSE_ZONE_LOST = "close-zone:lost";

export function isCloseDropZoneId(id: string): id is typeof CLOSE_ZONE_WON | typeof CLOSE_ZONE_LOST {
  return id === CLOSE_ZONE_WON || id === CLOSE_ZONE_LOST;
}

export function outcomeFromCloseZoneId(
  id: typeof CLOSE_ZONE_WON | typeof CLOSE_ZONE_LOST
): CloseOutcome {
  return id === CLOSE_ZONE_WON ? "won" : "lost";
}
