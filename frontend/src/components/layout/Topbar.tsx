"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/src/components/auth/AuthProvider";
import { useMembership } from "@/src/context/MembershipContext";
import { useNotifications } from "@/src/hooks/useNotifications";
import { cn } from "@/src/lib/cn";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import { initialsFromLabel, pageTitleForPath } from "@/src/lib/nav";

export default function Topbar({
  onMenuToggle,
  menuOpen,
}: {
  onMenuToggle?: () => void;
  menuOpen?: boolean;
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
    <header className="sticky top-0 z-30 flex h-[var(--vx-topbar-height)] shrink-0 items-center gap-4 border-b border-zinc-200/70 bg-white/90 px-4 backdrop-blur-md lg:px-6">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 transition-colors hover:bg-zinc-100 lg:hidden"
        onClick={onMenuToggle}
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <h1 className="shrink-0 text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
        {pageTitle}
      </h1>

      <div className="hidden min-w-0 flex-1 justify-center px-4 md:flex">
        <div className="relative w-full max-w-md">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
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
            className="h-10 w-full rounded-xl border border-zinc-200/90 bg-zinc-50/60 pl-10 pr-3 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 transition-all focus:border-blue-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15"
            onKeyDown={(e) => {
              if (e.key === "Enter") router.push("/clients");
            }}
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative md:hidden">
          <input
            type="search"
            placeholder="Search…"
            className="h-9 w-28 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-sm sm:w-36"
            onKeyDown={(e) => {
              if (e.key === "Enter") router.push("/clients");
            }}
          />
        </div>

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 transition-colors",
              "hover:bg-zinc-100 hover:text-zinc-800",
              notifOpen && "bg-zinc-100 text-zinc-800"
            )}
            aria-label="Notifications"
            aria-expanded={notifOpen}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--vx-accent)] ring-2 ring-white" />
            ) : null}
          </button>
          {notifOpen ? (
            <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-zinc-200/90 bg-white py-1 shadow-lg vx-animate-in">
              <p className="border-b border-zinc-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Notifications
              </p>
              {notifications.length === 0 ? (
                <p className="px-3 py-4 text-sm text-zinc-500">You&apos;re all caught up.</p>
              ) : (
                notifications.slice(0, 6).map((n) => (
                  <Link
                    key={n.type}
                    href="/tasks"
                    className="block px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
                    onClick={() => setNotifOpen(false)}
                  >
                    <span className="font-medium text-zinc-900">{n.message}</span>
                    {n.count > 1 ? (
                      <span className="ml-1 text-zinc-500">({n.count})</span>
                    ) : null}
                  </Link>
                ))
              )}
              <Link
                href="/tasks"
                className="block border-t border-zinc-100 px-3 py-2 text-center text-xs font-medium text-[var(--vx-accent)] hover:bg-zinc-50"
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
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--vx-accent)] px-4 text-sm font-semibold text-white shadow-[var(--vx-shadow-accent)] transition-colors hover:bg-[var(--vx-accent-hover)]"
            aria-expanded={createOpen}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
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
            <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-zinc-200/90 bg-white py-1 shadow-lg vx-animate-in">
              <Link
                href="/pipeline"
                className="block px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                onClick={() => setCreateOpen(false)}
              >
                New deal
              </Link>
              <Link
                href="/tasks"
                className="block px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                onClick={() => setCreateOpen(false)}
              >
                New task
              </Link>
              <Link
                href="/clients"
                className="block px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
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
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--vx-accent-muted)] text-sm font-semibold text-[var(--vx-accent)] ring-2 ring-white transition-transform hover:scale-[1.02]"
            aria-label="Account menu"
            aria-expanded={profileOpen}
          >
            {userInitials}
          </button>
          {profileOpen ? (
            <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-zinc-200/90 bg-white py-1 shadow-lg vx-animate-in">
              <div className="border-b border-zinc-100 px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-zinc-900">{userName}</p>
                <p className="truncate text-xs text-zinc-500">
                  {membership?.user_email}
                </p>
              </div>
              <Link
                href="/team"
                className="block px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
                onClick={() => setProfileOpen(false)}
              >
                Billing
              </Link>
              <Link
                href="/team"
                className="block px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
                onClick={() => setProfileOpen(false)}
              >
                Profile settings
              </Link>
              <button
                type="button"
                className="block w-full px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"
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
