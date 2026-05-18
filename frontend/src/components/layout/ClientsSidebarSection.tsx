"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/src/lib/cn";
import { NAV_LABELS, ROUTES } from "@/src/lib/product";

const STORAGE_KEY = "vexora:sidebar:clients-expanded";

type ChildItem = {
  href: string;
  label: string;
  match: (path: string) => boolean;
  requiresAnalytics?: boolean;
};

const CHILDREN: ChildItem[] = [
  {
    href: ROUTES.clients,
    label: NAV_LABELS.clientDirectory,
    match: (p) => p === ROUTES.clients,
  },
  {
    href: ROUTES.clientsAnalytics,
    label: NAV_LABELS.clientAnalytics,
    match: (p) => p.startsWith(ROUTES.clientsAnalytics),
    requiresAnalytics: true,
  },
  {
    href: ROUTES.clientsLeaderboards,
    label: NAV_LABELS.clientLeaderboards,
    match: (p) => p.startsWith(ROUTES.clientsLeaderboards),
    requiresAnalytics: true,
  },
];

function IconClients() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn(
        "shrink-0 text-zinc-400 transition-transform duration-200",
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
  analyticsAllowed,
  onNavigate,
}: {
  analyticsAllowed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const inClientsSection = pathname.startsWith(ROUTES.clients);

  const [expanded, setExpanded] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "0") {
        setExpanded(false);
      } else if (stored === "1") {
        setExpanded(true);
      } else {
        setExpanded(inClientsSection);
      }
    } catch {
      setExpanded(inClientsSection);
    }
    setHydrated(true);
  }, [inClientsSection]);

  useEffect(() => {
    if (!hydrated) return;
    if (inClientsSection) {
      setExpanded(true);
    }
  }, [inClientsSection, hydrated]);

  const persistExpanded = useCallback((next: boolean) => {
    setExpanded(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () => persistExpanded(!expanded);

  const parentActive = inClientsSection;

  const visibleChildren = CHILDREN.filter(
    (c) => !c.requiresAnalytics || analyticsAllowed
  );

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium transition-all duration-150",
          parentActive
            ? "bg-zinc-100/90 text-zinc-900"
            : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
        )}
        aria-expanded={expanded}
      >
        <span
          className={cn(
            "flex shrink-0",
            parentActive
              ? "text-[var(--vx-accent)]"
              : "text-zinc-400 group-hover:text-zinc-600"
          )}
        >
          <IconClients />
        </span>
        <span className={cn("min-w-0 flex-1", parentActive && "font-semibold")}>
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
          <ul className="ml-3 space-y-0.5 border-l border-zinc-200/80 py-0.5 pl-2">
            {visibleChildren.map((child) => {
              const active = child.match(pathname);
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    className={cn(
                      "block rounded-lg py-1.5 pl-2.5 pr-2 text-[12px] font-medium transition-all duration-150",
                      active
                        ? "border-l-2 border-[var(--vx-accent)] bg-zinc-50 text-zinc-900 -ml-px pl-[calc(0.625rem-1px)]"
                        : "text-zinc-500 hover:bg-zinc-50/80 hover:text-zinc-800"
                    )}
                  >
                    {child.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
