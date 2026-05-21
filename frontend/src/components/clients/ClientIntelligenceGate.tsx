"use client";

import type { ReactNode } from "react";
import { useBilling } from "@/src/hooks/useBilling";
import { useMembership } from "@/src/context/MembershipContext";
import { canViewAnalytics } from "@/src/lib/roles";
import ProBadge from "@/src/components/billing/ProBadge";
import ProPaywallOverlay from "@/src/components/billing/ProPaywallOverlay";
import Link from "next/link";
import { ROUTES } from "@/src/lib/product";

export default function ClientIntelligenceGate({
  title,
  description,
  children,
  preview,
}: {
  title: string;
  description: string;
  children: ReactNode;
  preview?: ReactNode;
}) {
  const { entitlements, isLocked } = useBilling();
  const { membership } = useMembership();
  const roleOk = canViewAnalytics(membership);
  const proLocked = isLocked("clientDeepAnalytics");
  const locked = proLocked || !roleOk;

  if (!roleOk) {
    return (
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-[var(--vx-shadow-card)]">
        <h2 className="text-lg font-semibold text-zinc-900">Analytics access required</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Your role needs &quot;View analytics&quot;. Ask an owner or manager on the Team
          page.
        </p>
        <Link
          href={ROUTES.clients}
          className="mt-4 inline-block text-sm font-medium text-[var(--vx-accent)] hover:underline"
        >
          ← All clients
        </Link>
      </div>
    );
  }

  if (!locked) {
    return <>{children}</>;
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[var(--vx-shadow-card)]">
      <div className="flex items-center justify-between border-b border-zinc-100/80 px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        </div>
        <ProBadge devUnlock={entitlements.devUnlock} />
      </div>
      <div className="pointer-events-none select-none p-6 blur-[2px]">
        {preview ?? children}
      </div>
      <ProPaywallOverlay
        title="Client intelligence — Pro"
        description="Unlock client analytics, leaderboards, and commercial insights across your portfolio."
      />
    </section>
  );
}
