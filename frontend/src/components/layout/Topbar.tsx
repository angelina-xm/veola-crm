"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/src/components/auth/AuthProvider";
import { useMembership } from "@/src/context/MembershipContext";
import { useNotifications } from "@/src/hooks/useNotifications";
import {
  ThemeSegmentedToggle,
  ThemeToggleIcon,
  ThemeToggleRow,
} from "@/src/components/theme/ThemeToggle";
import { cn } from "@/src/lib/cn";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import { initialsFromLabel, pageTitleForPath } from "@/src/lib/nav";
import { COPY, ROUTES } from "@/src/lib/product";

export default function Topbar({
  onMenuToggle,
  menuOpen,
  minimal = false,
}: {
  onMenuToggle?: () => void;
  menuOpen?: boolean;
  /** Slim bar on Deals workspace — title/search live in DealsWorkspaceBar */
  minimal?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { membership } = useMembership();
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const createRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, []);

  const { items: notifications, totalBadge } = useNotifications(
    companyId,
    companyId != null
  );

  const pageTitle = pageTitleForPath(pathname ?? "/");
  const userName = membership?.user_display_name ?? "Account";
  const userInitials = initialsFromLabel(userName);
  const companyName = membership?.company_name ?? "Vexora";

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (createRef.current && !createRef.current.contains(e.target as Node)) {
        setCreateOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex shrink-0 items-center gap-3 border-b border-[var(--vx-border)] bg-[var(--vx-surface)]/95 px-4 backdrop-blur-md lg:px-5",
        minimal
          ? "h-0 overflow-hidden border-transparent p-0 opacity-0 lg:h-[2.75rem] lg:opacity-100 lg:overflow-visible"
          : "h-[var(--vx-topbar-height)]"
      )}
    >
      <button
        type="button"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg text-[var(--vx-text-secondary)] transition-colors hover:bg-[var(--vx-bg-subtle)]",
          minimal ? "hidden" : "lg:hidden"
        )}
        onClick={onMenuToggle}
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {!minimal ? (
        <div className="min-w-0 shrink-0">
          <p className="truncate text-[11px] text-[var(--vx-text-muted)]">{companyName}</p>
          <h1 className="truncate text-base font-semibold tracking-tight text-[var(--vx-text)]">
            {pageTitle}
          </h1>
        </div>
      ) : (
        <div className="hidden flex-1 lg:block" aria-hidden />
      )}

      <div
        className={cn(
          "hidden min-w-0 flex-1 justify-center px-3 md:flex",
          minimal && "!hidden"
        )}
      >
        <div className="relative w-full max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vx-text-muted)]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M16 16l4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search clients, deals…"
            className="vx-input pl-9"
            onKeyDown={(e) => {
              if (e.key === "Enter") router.push(ROUTES.clients);
            }}
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeSegmentedToggle />
        <ThemeToggleIcon className="sm:hidden" />

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className={cn(
              "relative flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--vx-border)] text-[var(--vx-text-secondary)] transition-colors hover:bg-[var(--vx-bg-subtle)]",
              notifOpen && "bg-[var(--vx-bg-subtle)]"
            )}
            aria-label="Notifications"
            aria-expanded={notifOpen}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 17H9c0 1.1.9 2 2 2h2a2 2 0 002-2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            {totalBadge > 0 ? (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--vx-accent)] ring-2 ring-[var(--vx-surface)]" />
            ) : null}
          </button>
          {notifOpen ? (
            <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-[var(--vx-border)] bg-[var(--vx-surface-raised)] py-1 shadow-lg vx-animate-in">
              <p className="border-b border-[var(--vx-border-subtle)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--vx-text-muted)]">
                Notifications
              </p>
              {notifications.length === 0 ? (
                <p className="px-3 py-4 text-sm text-[var(--vx-text-muted)]">
                  You&apos;re all caught up.
                </p>
              ) : (
                notifications.slice(0, 6).map((n) => (
                  <Link
                    key={n.type}
                    href={ROUTES.tasks}
                    className="block px-3 py-2.5 text-sm text-[var(--vx-text-secondary)] hover:bg-[var(--vx-bg-subtle)]"
                    onClick={() => setNotifOpen(false)}
                  >
                    <span className="font-medium text-[var(--vx-text)]">{n.message}</span>
                    {n.count > 1 ? (
                      <span className="ml-1 text-[var(--vx-text-muted)]">({n.count})</span>
                    ) : null}
                  </Link>
                ))
              )}
              <Link
                href={ROUTES.tasks}
                className="block border-t border-[var(--vx-border-subtle)] px-3 py-2 text-center text-xs font-medium text-[var(--vx-accent)] hover:bg-[var(--vx-bg-subtle)]"
                onClick={() => setNotifOpen(false)}
              >
                View tasks
              </Link>
            </div>
          ) : null}
        </div>

        <div className="relative" ref={createRef}>
          <button
            type="button"
            onClick={() => setCreateOpen((v) => !v)}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-[var(--vx-accent)] px-3 text-xs font-semibold text-white shadow-[var(--vx-shadow-accent)] transition-colors hover:bg-[var(--vx-accent-hover)]"
            aria-expanded={createOpen}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Create
          </button>
          {createOpen ? (
            <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-[var(--vx-border)] bg-[var(--vx-surface-raised)] py-1 shadow-lg vx-animate-in">
              <Link
                href={ROUTES.deals}
                className="block px-3 py-2 text-sm text-[var(--vx-text-secondary)] hover:bg-[var(--vx-bg-subtle)]"
                onClick={() => setCreateOpen(false)}
              >
                {COPY.newDeal}
              </Link>
              <Link
                href={ROUTES.tasks}
                className="block px-3 py-2 text-sm text-[var(--vx-text-secondary)] hover:bg-[var(--vx-bg-subtle)]"
                onClick={() => setCreateOpen(false)}
              >
                New task
              </Link>
              <Link
                href={ROUTES.clients}
                className="block px-3 py-2 text-sm text-[var(--vx-text-secondary)] hover:bg-[var(--vx-bg-subtle)]"
                onClick={() => setCreateOpen(false)}
              >
                New client
              </Link>
            </div>
          ) : null}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--vx-accent-muted)] text-xs font-semibold text-[var(--vx-accent)] ring-2 ring-[var(--vx-surface)]"
            aria-label="Account menu"
            aria-expanded={profileOpen}
          >
            {userInitials}
          </button>
          {profileOpen ? (
            <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-[var(--vx-border)] bg-[var(--vx-surface-raised)] py-1 shadow-lg vx-animate-in">
              <div className="border-b border-[var(--vx-border-subtle)] px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-[var(--vx-text)]">{userName}</p>
                <p className="truncate text-xs text-[var(--vx-text-muted)]">
                  {membership?.user_email}
                </p>
              </div>
              <ThemeToggleRow onSelect={() => setProfileOpen(false)} />
              <Link
                href={ROUTES.team}
                className="block px-3 py-2 text-sm text-[var(--vx-text-secondary)] hover:bg-[var(--vx-bg-subtle)]"
                onClick={() => setProfileOpen(false)}
              >
                Billing
              </Link>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-[var(--vx-text-secondary)] hover:bg-[var(--vx-bg-subtle)]"
                onClick={() => {
                  setProfileOpen(false);
                  logout("manual_logout");
                }}
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
