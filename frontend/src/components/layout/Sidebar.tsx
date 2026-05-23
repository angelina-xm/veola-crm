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
import ClientsSidebarSection from "@/src/components/layout/ClientsSidebarSection";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  match?: (path: string) => boolean;
  muted?: boolean;
};

function IconDashboard() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconDeals() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 11l2 2 4-4M7 4h10a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCatalog() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h7v7H4V7zM13 7h7v4h-7V7zM13 13h7v4h-7v-4zM4 16h7v2H4v-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
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
      className={cn("vx-nav-link", item.muted && "pointer-events-none opacity-40")}
      data-active={active ? "true" : "false"}
      aria-current={active ? "page" : undefined}
    >
      <span className="vx-nav-icon">{item.icon}</span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function WorkspaceMark({ companyName }: { companyName: string }) {
  const initials = initialsFromLabel(companyName);
  return (
    <Link
      href={ROUTES.dashboard}
      className="mb-4 flex items-center gap-2.5 rounded-lg px-1 py-1 transition-opacity hover:opacity-90"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--vx-accent)] text-xs font-bold text-white">
        {initials.slice(0, 2)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[var(--vx-text)]">
          {companyName}
        </span>
        <span className="block text-[10px] text-[var(--vx-text-muted)]">Workspace</span>
      </span>
    </Link>
  );
}

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { membership } = useMembership();
  const companyName = membership?.company_name ?? "Vexora";
  const userName = membership?.user_display_name ?? "User";
  const userEmail = membership?.user_email ?? "";
  const userInitials = initialsFromLabel(userName);

  const analyticsAllowed = canViewAnalytics(membership);

  const menuMain: NavItem[] = [
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
  ];

  const menuWork: NavItem[] = [
    { href: ROUTES.products, label: NAV_LABELS.catalog, icon: <IconCatalog /> },
    { href: ROUTES.tasks, label: NAV_LABELS.tasks, icon: <IconTasks /> },
    {
      href: ROUTES.analytics,
      label: NAV_LABELS.analytics,
      icon: <IconChart />,
      muted: !analyticsAllowed,
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
      <div className="mt-4 first:mt-0">
        <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--vx-text-muted)]">
          {title}
        </p>
        <div className="space-y-0.5" onClick={onNavigate}>
          {items.map((item) => (
            <NavLink key={item.href + item.label} item={item} pathname={pathname} />
          ))}
        </div>
      </div>
    );

  return (
    <aside className="flex h-full flex-col border-r border-[var(--vx-border)] bg-[var(--vx-surface)] px-2 py-3 shadow-[var(--vx-shadow-sidebar)]">
      <div className="px-0.5" onClick={onNavigate}>
        <WorkspaceMark companyName={companyName} />
      </div>
      <nav className="flex-1 overflow-y-auto">
        <div className="space-y-0.5" onClick={onNavigate}>
          {menuMain.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
          <ClientsSidebarSection onNavigate={onNavigate} />
          {menuWork.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
        {section("Workspace", systemNav)}
      </nav>

      <div
        className="mt-3 flex items-center gap-2.5 rounded-lg border border-[var(--vx-border-subtle)] bg-[var(--vx-bg-subtle)] px-2.5 py-2"
        onClick={onNavigate}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--vx-accent)] text-[11px] font-semibold text-white">
          {userInitials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-[var(--vx-text)]">
            {userName}
          </span>
          <span className="block truncate text-[10px] text-[var(--vx-text-muted)]">
            {userEmail}
          </span>
        </span>
      </div>
    </aside>
  );
}
