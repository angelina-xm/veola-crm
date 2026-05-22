"use client";

import Link from "next/link";
import { cn } from "@/src/lib/cn";
import {
  HEALTH_CLASS,
  relationshipHealthLabel,
  relationshipStatusLabel,
  SIGNAL_DOT,
  STATUS_CLASS,
} from "@/src/lib/clientRelationship";
import { formatMoney } from "@/src/lib/formatRelative";
import { ROUTES } from "@/src/lib/product";
import type { RelationshipIntelligence } from "@/src/types";

export default function ClientRelationshipIntelligenceCard({
  intelligence,
}: {
  intelligence: RelationshipIntelligence;
}) {
  const health = intelligence.relationship_health;
  const signals = intelligence.signals.slice(0, 5);
  const owner = intelligence.team.relationship_owner;

  return (
    <section className="vx-card overflow-hidden">
      <div className="vx-card-head border-b border-[var(--vx-border)]">
        <div>
          <h2 className="text-[13px] font-semibold text-[var(--vx-text)]">
            Relationship intelligence
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--vx-text-muted)]">
            Operational read on this customer — not deal stage
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
            HEALTH_CLASS[health] ?? HEALTH_CLASS.healthy
          )}
        >
          {intelligence.relationship_health_label ||
            relationshipHealthLabel(health)}
        </span>
      </div>

      <div className="space-y-4 px-4 py-4">
        <p className="text-xs leading-relaxed text-[var(--vx-text-secondary)]">
          {intelligence.health_reason}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize",
              STATUS_CLASS[intelligence.relationship_status] ??
                STATUS_CLASS.active
            )}
          >
            {relationshipStatusLabel(intelligence.relationship_status)}
          </span>
          {intelligence.days_since_last_touch != null ? (
            <span className="text-[11px] text-[var(--vx-text-muted)]">
              Last touch {intelligence.days_since_last_touch}d ago
            </span>
          ) : null}
        </div>

        {signals.length > 0 ? (
          <ul className="space-y-1.5">
            {signals.map((sig) => (
              <li
                key={sig.code}
                className="flex gap-2.5 rounded-lg bg-[var(--vx-bg-subtle)] px-3 py-2"
              >
                <span
                  className={cn(
                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                    SIGNAL_DOT[sig.severity] ?? "bg-zinc-500"
                  )}
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--vx-text)]">
                    {sig.title}
                  </p>
                  <p className="text-[11px] leading-snug text-[var(--vx-text-muted)]">
                    {sig.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-[var(--vx-text-muted)]">
            No active signals — relationship looks calm.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--vx-border)] bg-[var(--vx-bg-subtle)]/50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--vx-text-muted)]">
              Product context
            </p>
            <p className="mt-1 text-xs font-medium text-[var(--vx-text)]">
              {intelligence.product_behavior.primary_pattern}
            </p>
            {intelligence.product_behavior.highlights.slice(0, 2).map((h) => (
              <p
                key={h}
                className="mt-1 text-[11px] text-[var(--vx-text-muted)]"
              >
                {h}
              </p>
            ))}
          </div>
          <div className="rounded-xl border border-[var(--vx-border)] bg-[var(--vx-bg-subtle)]/50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--vx-text-muted)]">
              Buying pattern
            </p>
            <p className="mt-1 text-xs text-[var(--vx-text-secondary)]">
              {intelligence.buying_patterns.won_deals} won ·{" "}
              {intelligence.buying_patterns.active_deals} active
              {intelligence.buying_patterns.repeat_buyer ? " · repeat buyer" : ""}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--vx-text-muted)]">
              Lifetime {formatMoney(intelligence.buying_patterns.lifetime_revenue)}
            </p>
          </div>
        </div>

        {(owner.display_name || owner.email) && (
          <p className="text-[11px] text-[var(--vx-text-muted)]">
            Relationship owner:{" "}
            <span className="font-medium text-[var(--vx-text-secondary)]">
              {owner.display_name ?? owner.email}
            </span>
            {owner.source === "inferred_from_deals" ? (
              <span className="text-[var(--vx-text-muted)]"> (from deals)</span>
            ) : null}
          </p>
        )}

        <Link
          href={`${ROUTES.clientsAnalytics}`}
          className="inline-block text-[11px] font-medium text-[var(--vx-accent)] hover:text-[var(--vx-accent-hover)]"
        >
          Commercial analytics →
        </Link>
      </div>
    </section>
  );
}
