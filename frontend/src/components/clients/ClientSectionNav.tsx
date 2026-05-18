"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/cn";
import { NAV_LABELS, ROUTES } from "@/src/lib/product";

const TABS = [
  { href: ROUTES.clients, label: "Client directory" },
  { href: ROUTES.clientsAnalytics, label: NAV_LABELS.clientAnalytics },
] as const;

export default function ClientSectionNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-1 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-1"
      aria-label="Clients section"
    >
      {TABS.map((tab) => {
        const active =
          tab.href === ROUTES.clients
            ? pathname === ROUTES.clients
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
