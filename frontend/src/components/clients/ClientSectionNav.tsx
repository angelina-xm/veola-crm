"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/cn";
import { NAV_LABELS, ROUTES } from "@/src/lib/product";
import { useMembership } from "@/src/context/MembershipContext";
import { canViewAnalytics } from "@/src/lib/roles";

const TABS = [
  { href: ROUTES.clients, label: NAV_LABELS.clientDirectory, exact: true },
  {
    href: ROUTES.clientsAnalytics,
    label: NAV_LABELS.clientAnalytics,
    requiresAnalytics: true,
  },
  {
    href: ROUTES.clientsLeaderboards,
    label: NAV_LABELS.clientLeaderboards,
    requiresAnalytics: true,
  },
] as const;

export default function ClientSectionNav() {
  const pathname = usePathname();
  const { membership } = useMembership();
  const analyticsAllowed = canViewAnalytics(membership);

  const tabs = TABS.filter((t) => !("requiresAnalytics" in t && t.requiresAnalytics) || analyticsAllowed);

  return (
    <nav
      className="flex flex-wrap gap-1 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-1"
      aria-label="Clients section"
    >
      {tabs.map((tab) => {
        const active =
          "exact" in tab && tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              active
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
