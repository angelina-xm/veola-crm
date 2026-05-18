"use client";

import type { ReactNode } from "react";
import { useBilling } from "@/src/hooks/useBilling";
import type { ProFeatureKey } from "@/src/lib/billing";
import ProBadge from "./ProBadge";
import ProPaywallOverlay from "./ProPaywallOverlay";

type Props = {
  feature: ProFeatureKey;
  title: string;
  paywallTitle: string;
  paywallDescription: string;
  children: ReactNode;
  /** Shown blurred behind paywall when locked; defaults to children */
  preview?: ReactNode;
  className?: string;
};

export default function ProFeatureGate({
  feature,
  title,
  paywallTitle,
  paywallDescription,
  children,
  preview,
  className = "",
}: Props) {
  const { entitlements, isLocked } = useBilling();
  const locked = isLocked(feature);

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[var(--vx-shadow-card)] ${className}`}
    >
      <div className="flex items-center justify-between border-b border-zinc-100/80 px-5 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        <ProBadge devUnlock={entitlements.devUnlock} />
      </div>
      <div
        className={
          locked
            ? "pointer-events-none select-none p-6 blur-[2px]"
            : "p-6"
        }
      >
        {locked ? (preview ?? children) : children}
      </div>
      {locked ? (
        <ProPaywallOverlay
          title={paywallTitle}
          description={paywallDescription}
        />
      ) : null}
    </section>
  );
}
