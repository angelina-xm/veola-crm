"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/src/lib/cn";
import { useTranslation } from "@/src/context/LocaleContext";
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
        "flex min-h-[5.5rem] flex-1 flex-col justify-center rounded-xl border border-dashed px-4 py-4 transition-all duration-300",
        variant === "won"
          ? "border-emerald-500/20 bg-[var(--vx-card-bg)]/50"
          : "border-[var(--vx-border)] bg-[var(--vx-card-bg)]/30",
        isOver &&
          (variant === "won"
            ? "border-emerald-500/35 bg-emerald-500/5"
            : "border-[var(--vx-text-muted)]/30 bg-[var(--vx-surface)]/50"),
        disabled && "pointer-events-none opacity-40"
      )}
    >
      <p className="text-[13px] font-medium text-[var(--vx-text)]">{label}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--vx-text-muted)]">
        {hint}
      </p>
    </div>
  );
}

type Props = {
  canClose: boolean;
  hasWon: boolean;
  hasLost: boolean;
};

export default function CloseDropZones({ canClose, hasWon, hasLost }: Props) {
  const { t } = useTranslation();

  if (!canClose || (!hasWon && !hasLost)) return null;

  return (
    <div className="vx-deals-close-panel flex flex-col gap-3">
      <div className="border-b border-[var(--vx-border-subtle)] pb-3">
        <h2 className="text-[13px] font-medium text-[var(--vx-text)]">
          {t("deals.closeDeal")}
        </h2>
        <p className="mt-1 text-[11px] text-[var(--vx-text-muted)]">
          {t("deals.closeDealHint")}
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-3">
        {hasWon ? (
          <Zone
            id={CLOSE_ZONE_WON}
            variant="won"
            label={t("deals.dropWon")}
            hint={t("deals.closeWonConfirm")}
            disabled={!canClose}
          />
        ) : null}
        {hasLost ? (
          <Zone
            id={CLOSE_ZONE_LOST}
            variant="lost"
            label={t("deals.dropLost")}
            hint={t("deals.closeLostReason")}
            disabled={!canClose}
          />
        ) : null}
      </div>
    </div>
  );
}
