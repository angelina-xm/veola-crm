"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/src/lib/cn";
import { useBilling } from "@/src/hooks/useBilling";
import { useMembership } from "@/src/context/MembershipContext";
import { canViewAnalytics } from "@/src/lib/roles";
import PremiumNavChild from "@/src/components/clients/PremiumNavChild";
import { NAV_LABELS, ROUTES } from "@/src/lib/product";

const STORAGE_KEY = "vexora:sidebar:clients-expanded";

type ChildItem = {
  href: string;
  label: string;
  match: (path: string) => boolean;
  premium?: boolean;
};

const CHILDREN: ChildItem[] = [
  {
    href: ROUTES.clients,
    label: NAV_LABELS.clientAll,
    match: (p) => p === ROUTES.clients,
  },
  {
    href: ROUTES.clientsAnalytics,
    label: NAV_LABELS.clientAnalytics,
    match: (p) => p.startsWith(ROUTES.clientsAnalytics),
    premium: true,
  },
  {
    href: ROUTES.clientsLeaderboards,
    label: NAV_LABELS.clientLeaderboards,
    match: (p) => p.startsWith(ROUTES.clientsLeaderboards),
    premium: true,
  },
];

function IconClients() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 11a4 4 0 10-8 0M4 20a8 8 0 0116 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn(
        "shrink-0 text-[var(--vx-text-muted)] transition-transform duration-200",
        open && "rotate-90"
      )}
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ClientsSidebarSection({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { membership } = useMembership();
  const { entitlements, isLocked } = useBilling();
  const inClientsSection = pathname.startsWith(ROUTES.clients);

  const intelligenceLocked =
    isLocked("clientDeepAnalytics") || !canViewAnalytics(membership);

  const [expanded, setExpanded] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "0") setExpanded(false);
      else if (stored === "1") setExpanded(true);
      else setExpanded(inClientsSection);
    } catch {
      setExpanded(inClientsSection);
    }
    setHydrated(true);
  }, [inClientsSection]);

  useEffect(() => {
    if (!hydrated) return;
    if (inClientsSection) setExpanded(true);
  }, [inClientsSection, hydrated]);

  const persistExpanded = useCallback((next: boolean) => {
    setExpanded(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const parentActive = inClientsSection;

  return (
    <div>
      <button
        type="button"
        onClick={() => persistExpanded(!expanded)}
        className="vx-nav-link w-full"
        data-active={parentActive ? "true" : "false"}
        aria-expanded={expanded}
      >
        <span className="vx-nav-icon">
          <IconClients />
        </span>
        <span className="min-w-0 flex-1 truncate text-left">
          {NAV_LABELS.clients}
        </span>
        <IconChevron open={expanded} />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden" onClick={onNavigate}>
          <ul className="ml-[1.35rem] space-y-0.5 border-l border-[var(--vx-border)] py-0.5 pl-2">
            {CHILDREN.map((child) => {
              const active = child.match(pathname);
              const locked = Boolean(child.premium && intelligenceLocked);
              return (
                <li key={child.href}>
                  <PremiumNavChild
                    href={child.href}
                    label={child.label}
                    active={active}
                    locked={locked}
                    lockHint={
                      !canViewAnalytics(membership)
                        ? "Requires analytics permission"
                        : "Upgrade to Pro for client intelligence"
                    }
                    devUnlock={entitlements.devUnlock}
                    onNavigate={onNavigate}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
