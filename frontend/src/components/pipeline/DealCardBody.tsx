"use client";

import DealAvatar from "./DealAvatar";
import {
  assigneeLabel,
  clientById,
  daysInStage,
  formatActivityShort,
  formatDealAmountUsd,
  inferStageProbability,
} from "@/src/lib/dealDisplay";
import {
  dealCardShellClass,
  dealStatusBadges,
  type DealAttentionVisual,
} from "@/src/lib/dealAttention";
import { relationshipStatusLabel } from "@/src/lib/clientRelationship";
import { translate } from "@/src/i18n/translate";
import { dueDateVsToday } from "@/src/lib/dealTaskSignal";
import { cn } from "@/src/lib/cn";
import type { Activity, Client, Deal } from "@/src/types";

const BADGE_CLASS: Record<string, string> = {
  neutral: "vx-deal-pill vx-deal-pill--neutral",
  warn: "vx-deal-pill vx-deal-pill--warn",
  risk: "vx-deal-pill vx-deal-pill--risk",
  closing: "vx-deal-pill vx-deal-pill--closing",
  positive: "vx-deal-pill vx-deal-pill--positive",
};

function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function formatDueHint(due: string | undefined): string | null {
  if (!due) return null;
  const d = dueDateVsToday(due);
  if (d < 0) return translate("tasks.overdue");
  if (d === 0) return translate("tasks.dueToday");
  if (d === 1) return translate("pipeline.dueTomorrow");
  if (d <= 7) return translate("pipeline.dueInDays", { count: d });
  return null;
}

export type DealCardBodyProps = {
  deal: Deal;
  clients: Client[];
  openTasksForDeal: Activity[];
  notes: Activity[];
  stageName?: string;
  visual: DealAttentionVisual;
  isOverdue: boolean;
  daysIdle: number | null;
  nextStep: string;
  nextTaskDue?: string;
  shellOpts?: {
    dragging?: boolean;
    dimmed?: boolean;
    spotlight?: boolean;
  };
  onOpen?: () => void;
  footerActions?: React.ReactNode;
  savingLine?: boolean;
};

export default function DealCardBody({
  deal,
  clients,
  openTasksForDeal: _openTasksForDeal,
  notes: _notes,
  stageName,
  visual,
  isOverdue,
  daysIdle,
  nextStep,
  nextTaskDue,
  shellOpts,
  onOpen,
  footerActions,
  savingLine,
}: DealCardBodyProps) {
  const client = clientById(clients, deal.client);
  const clientLine =
    client?.name ??
    (deal.client != null && deal.client !== "" ? String(deal.client) : translate("pipeline.noClient"));
  const amount = formatDealAmountUsd(deal.amount);
  const probability = inferStageProbability(stageName);
  const ownerEmail = deal.assigned_to_email ?? null;
  const ownerName = assigneeLabel(ownerEmail);
  const stageDays = daysInStage(deal.created_at);
  const dueHint = formatDueHint(nextTaskDue);

  const touchIso = (() => {
    const candidates: number[] = [];
    if (deal.created_at) {
      const t = new Date(deal.created_at).getTime();
      if (Number.isFinite(t)) candidates.push(t);
    }
    for (const a of _openTasksForDeal) {
      const t = new Date(a.created_at).getTime();
      if (Number.isFinite(t)) candidates.push(t);
    }
    for (const a of _notes) {
      const t = new Date(a.created_at).getTime();
      if (Number.isFinite(t)) candidates.push(t);
    }
    if (!candidates.length) return undefined;
    return new Date(Math.max(...candidates)).toISOString();
  })();

  const badges = dealStatusBadges({
    visual,
    isOverdue,
    daysIdle,
    relationshipLabel: client?.relationship_status
      ? relationshipStatusLabel(client.relationship_status)
      : null,
  });

  const HeadBlock = onOpen ? "button" : "div";
  const headProps = onOpen
    ? {
        type: "button" as const,
        onClick: onOpen,
        className: "flex w-full items-start gap-3 text-left",
      }
    : { className: "flex w-full items-start gap-3" };

  return (
    <article className={dealCardShellClass(visual, shellOpts)}>
      <div className="p-4">
        <HeadBlock {...headProps}>
          <DealAvatar label={clientLine} tone="client" size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 pt-0.5">
                <p className="truncate text-[15px] font-semibold leading-tight tracking-tight text-[var(--vx-text)]">
                  {clientLine}
                </p>
                <p className="mt-1 truncate text-[12px] text-[var(--vx-text-muted)]">
                  {deal.title}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {amount ? (
                  <p className="text-[15px] font-semibold leading-none tracking-tight text-[var(--vx-text)] vx-tabular">
                    {amount}
                  </p>
                ) : null}
                {probability != null ? (
                  <p className="mt-1 text-[11px] text-[var(--vx-text-muted)] vx-tabular">
                    {probability}%
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </HeadBlock>

        {badges.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <span key={b.label} className={cn(BADGE_CLASS[b.tone])}>
                <span className="vx-deal-pill-dot" data-tone={b.tone} aria-hidden />
                {b.label}
              </span>
            ))}
          </div>
        ) : null}

        <p
          className={cn(
            "mt-3 flex items-start gap-2 text-[12px] leading-snug",
            isOverdue ? "text-amber-200/90" : "text-[var(--vx-text-secondary)]"
          )}
        >
          <span className="mt-0.5 shrink-0 text-[var(--vx-text-muted)]" aria-hidden>
            →
          </span>
          <span className="line-clamp-2">{nextStep}</span>
        </p>

        <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-[var(--vx-border-subtle)]/80 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <DealAvatar
              label={ownerName}
              tone="assignee"
              size="sm"
              title={ownerEmail ?? translate("deals.unassigned")}
            />
            <span className="truncate text-[11px] font-medium text-[var(--vx-text-secondary)]">
              {ownerName}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-[10px] text-[var(--vx-text-muted)] vx-tabular">
            <span>{formatActivityShort(touchIso)}</span>
            {dueHint ? (
              <>
                <span className="opacity-40" aria-hidden>
                  ·
                </span>
                <span className={isOverdue ? "text-amber-300/90" : undefined}>
                  {dueHint}
                </span>
              </>
            ) : null}
            {stageDays != null ? (
              <span className="flex items-center gap-0.5">
                <ClockIcon />
                {stageDays}d
              </span>
            ) : null}
          </div>
        </div>

        {footerActions ? (
          <div
            className="mt-2 flex justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {footerActions}
          </div>
        ) : null}

        {savingLine ? (
          <p className="mt-2 text-[10px] text-[var(--vx-text-muted)]">{translate("pipeline.saving")}</p>
        ) : null}
      </div>
    </article>
  );
}
