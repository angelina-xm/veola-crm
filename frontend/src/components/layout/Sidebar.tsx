"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/cn";
import { initialsFromLabel } from "@/src/lib/nav";
import { NAV_LABELS, ROUTES } from "@/src/lib/product";
import { useMembership } from "@/src/context/MembershipContext";
import {
  canManageAutomations,
  canManageTeam,
  canViewAnalytics,
} from "@/src/lib/roles";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  match?: (path: string) => boolean;
  muted?: boolean;
};

function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconDeals() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h6M14 7h6M4 12h4M10 12h10M4 17h8M14 17h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTasks() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 11l2 2 4-4M7 4h10a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

function IconChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19V9M10 19V5M16 19v-6M22 19H2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTeam() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 11a3 3 0 100-6 3 3 0 000 6zM4 20a8 8 0 0116 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconAutomation() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9.5 9.5a2.5 2.5 0 014.5 1.5c0 2-2.5 2-2.5 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17" r="0.75" fill="currentColor" />
    </svg>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = item.match
    ? item.match(pathname)
    : pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(item.href));
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
        item.muted && "pointer-events-none opacity-45",
        active
          ? "bg-zinc-100 text-zinc-900 shadow-sm"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      )}
    >
      <span
        className={cn(
          "flex shrink-0",
          active ? "text-[var(--vx-accent)]" : "text-zinc-400 group-hover:text-zinc-600"
        )}
      >
        {item.icon}
      </span>
      <span className={cn(active && "font-semibold")}>{item.label}</span>
    </Link>
  );
}

function WorkspaceSwitcher({ companyName }: { companyName: string }) {
  const initials = initialsFromLabel(companyName);
  return (
    <button
      type="button"
      className="mb-5 flex w-full items-center gap-2.5 rounded-xl border border-zinc-200/80 bg-white px-2.5 py-2.5 text-left shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50/80"
      aria-label="Current workspace"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--vx-accent)] text-xs font-bold text-white">
        {initials.slice(0, 2)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-zinc-900">
          {companyName}
        </span>
        <span className="block text-[11px] text-zinc-500">Workspace</span>
      </span>
      <svg
        className="shrink-0 text-zinc-400"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M6 9l6 6 6-6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { membership } = useMembership();
  const companyName = membership?.company_name ?? "Vexora";
  const userName = membership?.user_display_name ?? "User";
  const userEmail = membership?.user_email ?? "";
  const userInitials = initialsFromLabel(userName);

  const mainNav: NavItem[] = [
    {
      href: ROUTES.dashboard,
      label: NAV_LABELS.dashboard,
      icon: <IconDashboard />,
      match: (p) => p === ROUTES.dashboard || p === "/",
    },
    {
      href: ROUTES.deals,
      label: NAV_LABELS.deals,
      icon: <IconDeals />,
      match: (p) => p === ROUTES.deals || p === ROUTES.pipeline,
    },
    { href: ROUTES.clients, label: NAV_LABELS.clients, icon: <IconClients /> },
    { href: ROUTES.tasks, label: NAV_LABELS.tasks, icon: <IconTasks /> },
    {
      href: ROUTES.analytics,
      label: NAV_LABELS.analytics,
      icon: <IconChart />,
      muted: !canViewAnalytics(membership),
    },
  ];

  const systemNav: NavItem[] = [];
  if (canManageTeam(membership)) {
    systemNav.push({ href: ROUTES.team, label: NAV_LABELS.team, icon: <IconTeam /> });
  }
  if (canManageAutomations(membership)) {
    systemNav.push({
      href: ROUTES.automation,
      label: NAV_LABELS.automation,
      icon: <IconAutomation />,
    });
  }

  const section = (title: string, items: NavItem[]) =>
    items.length === 0 ? null : (
      <div className="mt-5 first:mt-0">
        <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          {title}
        </p>
        <div className="space-y-0.5" onClick={onNavigate}>
          {items.map((item) =>
            item.muted ? (
              <NavLink key={item.label} item={item} pathname={pathname} />
            ) : (
              <NavLink key={item.href} item={item} pathname={pathname} />
            )
          )}
        </div>
      </div>
    );

  return (
    <aside className="flex h-full flex-col border-r border-zinc-200/60 bg-white px-3 py-4 shadow-[var(--vx-shadow-sidebar)]">
      <div className="px-1" onClick={onNavigate}>
        <WorkspaceSwitcher companyName={companyName} />
      </div>
      <nav className="flex-1 overflow-y-auto px-0.5">
        {section("Menu", mainNav.filter((i) => !i.muted || i.label === "Analytics"))}
        {section("System", systemNav)}
      </nav>

      <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50/80 px-2 py-2">
        <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Support
        </p>
        <div className="space-y-0.5" onClick={onNavigate}>
          <a
            href="https://docs.vexora.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-zinc-600 transition-colors hover:bg-white hover:text-zinc-900"
          >
            <IconHelp />
            Help Center
          </a>
          <a
            href="mailto:support@vexora.app"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-zinc-600 transition-colors hover:bg-white hover:text-zinc-900"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 6h16v12H4V6zM4 7l8 6 8-6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            Contact Support
          </a>
        </div>
      </div>

      <div
        className="mt-3 flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50 px-3 py-3"
        onClick={onNavigate}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--vx-accent)] text-sm font-semibold text-white">
          {userInitials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-zinc-900">
            {userName}
          </span>
          <span className="block truncate text-xs text-zinc-500">{userEmail}</span>
        </span>
      </div>
    </aside>
  );
}
