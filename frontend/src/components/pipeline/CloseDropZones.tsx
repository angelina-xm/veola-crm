"use client";

import { useDroppable } from "@dnd-kit/core";
import type { CloseOutcome } from "@/src/lib/pipelineLifecycle";
import { CLOSE_ZONE_LOST, CLOSE_ZONE_WON } from "@/src/lib/pipelineLifecycle";

function Zone({
  id,
  label,
  hint,
  variant,
  disabled,
}: {
  id: string;
  label: string;
  hint: string;
  variant: CloseOutcome;
  disabled?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });
  const base =
    variant === "won"
      ? "border-emerald-300 bg-emerald-50/80 text-emerald-900"
      : "border-zinc-300 bg-zinc-50 text-zinc-800";
  const over =
    variant === "won"
      ? "ring-2 ring-emerald-500 bg-emerald-100"
      : "ring-2 ring-zinc-500 bg-zinc-100";

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[120px] w-44 shrink-0 flex-col justify-center rounded-lg border-2 border-dashed px-3 py-4 transition ${base} ${
        isOver ? over : ""
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xs opacity-80">{hint}</p>
    </div>
  );
}

type Props = {
  canClose: boolean;
  hasWon: boolean;
  hasLost: boolean;
};

export default function CloseDropZones({ canClose, hasWon, hasLost }: Props) {
  if (!canClose || (!hasWon && !hasLost)) return null;

  return (
    <div className="flex shrink-0 flex-col gap-3 pl-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
        Close deal
      </p>
      {hasWon ? (
        <Zone
          id={CLOSE_ZONE_WON}
          variant="won"
          label="Won"
          hint="Drop to close · review & confirm"
          disabled={!canClose}
        />
      ) : null}
      {hasLost ? (
        <Zone
          id={CLOSE_ZONE_LOST}
          variant="lost"
          label="Lost"
          hint="Drop to close · reason required"
          disabled={!canClose}
        />
      ) : null}
    </div>
  );
}
