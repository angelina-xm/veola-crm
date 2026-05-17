"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/components/auth/AuthProvider";
import { useMembership } from "@/src/context/MembershipContext";
import Button from "@/src/components/ui/Button";
import { cn } from "@/src/lib/cn";

export default function Topbar({
  onMenuToggle,
  menuOpen,
}: {
  onMenuToggle?: () => void;
  menuOpen?: boolean;
}) {
  const router = useRouter();
  const { logout } = useAuth();
  const { membership } = useMembership();
  const [createOpen, setCreateOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const createRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (
        createRef.current &&
        !createRef.current.contains(e.target as Node)
      ) {
        setCreateOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const roleLabel = membership?.role ?? "member";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200/80 bg-white/80 px-4 backdrop-blur-md lg:px-6">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 lg:hidden"
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

      <div className="relative hidden min-w-0 flex-1 sm:block sm:max-w-md">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="search"
          placeholder="Search deals, clients…"
          className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50/80 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              router.push("/clients");
            }
          }}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative" ref={createRef}>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateOpen((v) => !v)}
            aria-expanded={createOpen}
          >
            Quick create
          </Button>
          {createOpen ? (
            <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-zinc-200 bg-white py-1 shadow-md vx-animate-in">
              <Link
                href="/"
                className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                onClick={() => setCreateOpen(false)}
              >
                New deal
              </Link>
              <Link
                href="/tasks"
                className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                onClick={() => setCreateOpen(false)}
              >
                New task
              </Link>
              <Link
                href="/clients"
                className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                onClick={() => setCreateOpen(false)}
              >
                New client
              </Link>
            </div>
          ) : null}
        </div>

        <Link
          href="/tasks"
          className="hidden h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 sm:flex"
          title="Notifications & tasks"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4.5-5.8M9 17H4l1.4-1.4A2 2 0 0110 14.2V11a6 6 0 014.5-5.8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </Link>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white pl-1 pr-2.5 text-sm hover:bg-zinc-50"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-xs font-semibold text-zinc-700">
              {roleLabel.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden capitalize text-zinc-700 sm:inline">
              {roleLabel}
            </span>
          </button>
          {profileOpen ? (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-md vx-animate-in">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
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
