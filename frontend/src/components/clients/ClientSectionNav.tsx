"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/cn";
import { useBilling } from "@/src/hooks/useBilling";
import { useMembership } from "@/src/context/MembershipContext";
import { useTranslation } from "@/src/context/LocaleContext";
import { canViewAnalytics } from "@/src/lib/roles";
import ProBadge from "@/src/components/billing/ProBadge";
import { ROUTES } from "@/src/lib/product";

function IconLock() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 11V8a5 5 0 0110 0v3M6 11h12v10H6V11z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default function ClientSectionNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { membership } = useMembership();
  const { entitlements, isLocked } = useBilling();
  const intelligenceLocked =
    isLocked("clientDeepAnalytics") || !canViewAnalytics(membership);

  const tabs = [
    { href: ROUTES.clients, label: t("nav.clientAll"), exact: true as const },
    {
      href: ROUTES.clientsAnalytics,
      label: t("nav.clientAnalytics"),
      premium: true as const,
    },
    {
      href: ROUTES.clientsLeaderboards,
      label: t("nav.clientLeaderboards"),
      premium: true as const,
    },
  ];

  return (
    <nav
      className="flex flex-wrap gap-1 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-1"
      aria-label={t("clients.sectionNav")}
    >
      {tabs.map((tab) => {
        const active =
          "exact" in tab && tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
        const locked = "premium" in tab && tab.premium && intelligenceLocked;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            title={locked ? t("common.proClientIntelligence") : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
              locked
                ? "text-zinc-400 hover:bg-white/60"
                : active
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
            )}
          >
            {tab.label}
            {locked ? (
              <>
                <IconLock />
                <ProBadge devUnlock={entitlements.devUnlock} className="!px-1 !py-0 text-[9px]" />
              </>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
