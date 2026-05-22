"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/src/lib/cn";
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

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[7.5rem] w-36 shrink-0 flex-col justify-center rounded-xl border border-dashed px-3 py-3 transition-all duration-200",
        variant === "won"
          ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-400"
          : "border-[var(--vx-border)] bg-[var(--vx-bg-subtle)] text-[var(--vx-text-secondary)]",
        isOver &&
          (variant === "won"
            ? "border-emerald-400/50 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.12)]"
            : "border-[var(--vx-text-muted)]/40 bg-[var(--vx-surface)] shadow-md"),
        disabled && "pointer-events-none opacity-40"
      )}
    >
      <p className="text-xs font-semibold">{label}</p>
      <p className="mt-1 text-[10px] opacity-75">{hint}</p>
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
    <div className="flex shrink-0 flex-col gap-2 pl-1">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--vx-text-muted)]">
        Close
      </p>
      {hasWon ? (
        <Zone
          id={CLOSE_ZONE_WON}
          variant="won"
          label="Won"
          hint="Drop to confirm"
          disabled={!canClose}
        />
      ) : null}
      {hasLost ? (
        <Zone
          id={CLOSE_ZONE_LOST}
          variant="lost"
          label="Lost"
          hint="Drop · add reason"
          disabled={!canClose}
        />
      ) : null}
    </div>
  );
}
