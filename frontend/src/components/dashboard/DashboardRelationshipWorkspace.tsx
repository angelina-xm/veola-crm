"use client";

import Link from "next/link";
import { cn } from "@/src/lib/cn";
import { SIGNAL_DOT } from "@/src/lib/clientRelationship";
import { ROUTES } from "@/src/lib/product";
import { useTranslation } from "@/src/context/LocaleContext";
import type { RelationshipWorkspace } from "@/src/types";

export default function DashboardRelationshipWorkspace({
  workspace,
  loading,
}: {
  workspace: RelationshipWorkspace | null;
  loading?: boolean;
}) {
  const { t } = useTranslation();

  const healthLabels: Record<string, string> = {
    healthy: t("clients.healthHealthy"),
    cooling_down: t("clients.healthCooling"),
    needs_attention: t("clients.healthNeedsAttention"),
    re_engagement: t("dashboardStats.healthReEngage"),
  };

  const summary = workspace?.health_summary;
  const signals = workspace?.signals?.slice(0, 4) ?? [];

  return (
    <section className="vx-card flex flex-col md:col-span-2">
      <div className="vx-card-head">
        <div>
          <h2 className="text-[13px] font-semibold text-[var(--vx-text)]">
            {t("dashboardStats.relationshipTitle")}
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--vx-text-muted)]">
            {t("dashboardStats.relationshipHint")}
          </p>
        </div>
        <Link
          href={ROUTES.clients}
          className="text-xs font-medium text-[var(--vx-accent)] hover:text-[var(--vx-accent-hover)]"
        >
          {t("nav.clients")}
        </Link>
      </div>
      <div className="px-4 py-3">
        {loading ? (
          <div className="h-20 animate-pulse rounded-lg bg-[var(--vx-bg-subtle)]" />
        ) : !workspace ? (
          <p className="text-sm text-[var(--vx-text-muted)]">
            {t("dashboardStats.relationshipUnavailable")}
          </p>
        ) : (
          <>
            {summary ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {Object.entries(summary).map(([key, count]) =>
                  count > 0 ? (
                    <span
                      key={key}
                      className="rounded-lg bg-[var(--vx-bg-subtle)] px-2.5 py-1 text-[11px] text-[var(--vx-text-secondary)]"
                    >
                      <span className="font-semibold text-[var(--vx-text)]">
                        {count}
                      </span>{" "}
                      {healthLabels[key] ?? key}
                    </span>
                  ) : null
                )}
              </div>
            ) : null}
            {signals.length === 0 ? (
              <p className="text-sm text-[var(--vx-text-muted)]">
                {t("dashboardStats.relationshipNoSignals")}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {signals.map((sig, i) => (
                  <li key={`${sig.client_id}-${sig.code}-${i}`}>
                    <Link
                      href={`${ROUTES.clients}/${sig.client_id}`}
                      className="flex items-start gap-2.5 rounded-lg bg-[var(--vx-bg-subtle)] px-3 py-2 transition-colors hover:bg-[var(--vx-nav-active-bg)]"
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                          SIGNAL_DOT[sig.severity] ?? "bg-zinc-400"
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-[var(--vx-text)]">
                          {sig.client_name}
                        </span>
                        <span className="block text-[11px] text-[var(--vx-text-muted)]">
                          {sig.detail || sig.title}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}
