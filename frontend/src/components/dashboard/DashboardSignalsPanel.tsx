"use client";

import Link from "next/link";
import { cn } from "@/src/lib/cn";
import { ROUTES } from "@/src/lib/product";
import type { PipelineHealth } from "@/src/types";

type Signal = {
  dot: string;
  text: React.ReactNode;
  href?: string;
};

function buildSignals(health: PipelineHealth | null): Signal[] {
  if (!health) return [];
  const items: Signal[] = [];
  if (health.at_risk > 0) {
    items.push({
      dot: "bg-rose-500",
      text: (
        <>
          <b>{health.at_risk}</b> deal{health.at_risk === 1 ? "" : "s"} at risk
        </>
      ),
      href: ROUTES.deals,
    });
  }
  if (health.attention_needed > 0) {
    items.push({
      dot: "bg-amber-500",
      text: (
        <>
          <b>{health.attention_needed}</b> need follow-up
        </>
      ),
      href: ROUTES.deals,
    });
  }
  if (health.waiting_on_client > 0) {
    items.push({
      dot: "bg-sky-500",
      text: (
        <>
          <b>{health.waiting_on_client}</b> waiting on client
        </>
      ),
      href: ROUTES.deals,
    });
  }
  if (health.healthy > 0 && items.length < 3) {
    items.push({
      dot: "bg-emerald-500",
      text: (
        <>
          <b>{health.healthy}</b> healthy on track
        </>
      ),
    });
  }
  return items;
}

export default function DashboardSignalsPanel({
  health,
  loading,
}: {
  health: PipelineHealth | null;
  loading?: boolean;
}) {
  const signals = buildSignals(health);

  return (
    <section className="vx-card flex flex-col">
      <div className="vx-card-head">
        <div>
          <h2 className="text-[13px] font-semibold text-[var(--vx-text)]">
            Signals
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--vx-text-muted)]">
            Deal health at a glance
          </p>
        </div>
        <Link
          href={ROUTES.deals}
          className="text-xs font-medium text-[var(--vx-accent)] hover:text-[var(--vx-accent-hover)]"
        >
          Open deals
        </Link>
      </div>
      <div className="flex-1 px-4 py-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-[var(--vx-bg-subtle)]"
              />
            ))}
          </div>
        ) : signals.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--vx-text-muted)]">
            {health?.summary_message ?? "No active signals — pipeline looks calm."}
          </p>
        ) : (
          <ul className="space-y-2">
            {signals.map((sig, i) => (
              <li key={i}>
                {sig.href ? (
                  <Link
                    href={sig.href}
                    className="flex items-center gap-2.5 rounded-lg bg-[var(--vx-bg-subtle)] px-3 py-2.5 transition-colors hover:bg-[var(--vx-nav-active-bg)]"
                  >
                    <span
                      className={cn("h-2 w-2 shrink-0 rounded-full", sig.dot)}
                    />
                    <span className="flex-1 text-xs leading-snug text-[var(--vx-text-secondary)]">
                      {sig.text}
                    </span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2.5 rounded-lg bg-[var(--vx-bg-subtle)] px-3 py-2.5">
                    <span
                      className={cn("h-2 w-2 shrink-0 rounded-full", sig.dot)}
                    />
                    <span className="flex-1 text-xs leading-snug text-[var(--vx-text-secondary)]">
                      {sig.text}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
