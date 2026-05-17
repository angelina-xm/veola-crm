"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/cn";
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
};

function IconPipeline() {
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

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = item.match
    ? item.match(pathname)
    : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors duration-150",
        active
          ? "bg-zinc-900 text-white shadow-sm"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      )}
    >
      <span
        className={cn(
          "flex shrink-0 opacity-80",
          active ? "text-white" : "text-zinc-400 group-hover:text-zinc-600"
        )}
      >
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { membership } = useMembership();

  const operational: NavItem[] = [
    {
      href: "/",
      label: "Pipeline",
      icon: <IconPipeline />,
      match: (p) => p === "/" || p === "/pipeline",
    },
    { href: "/tasks", label: "Tasks", icon: <IconTasks /> },
    { href: "/clients", label: "Clients", icon: <IconClients /> },
    {
      href: "/deals/closed",
      label: "Closed deals",
      icon: <IconChart />,
    },
  ];

  const workspace: NavItem[] = [];
  if (canViewAnalytics(membership)) {
    workspace.push({
      href: "/analytics",
      label: "Analytics",
      icon: <IconChart />,
    });
  }
  if (canManageTeam(membership)) {
    workspace.push({
      href: "/team",
      label: "Team",
      icon: <IconClients />,
    });
  }
  if (canManageAutomations(membership)) {
    workspace.push({
      href: "/settings/automation",
      label: "Automation",
      icon: <IconTasks />,
    });
  }

  const section = (title: string, items: NavItem[]) =>
    items.length === 0 ? null : (
      <div className="mt-6 first:mt-0">
        <p className="mb-2 px-2.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          {title}
        </p>
        <div className="space-y-0.5" onClick={onNavigate}>
          {items.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      </div>
    );

  return (
    <aside className="flex h-full flex-col border-r border-zinc-200/80 bg-zinc-50/90 px-3 py-4">
      <Link
        href="/"
        className="mb-6 flex items-center gap-2.5 px-2.5"
        onClick={onNavigate}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white">
          V
        </span>
        <span>
          <span className="block text-sm font-semibold tracking-tight text-zinc-900">
            Vexora
          </span>
          <span className="block text-[11px] text-zinc-500">Sales OS</span>
        </span>
      </Link>
      <nav className="flex-1 overflow-y-auto">
        {section("Operational", operational)}
        {section("Workspace", workspace)}
      </nav>
    </aside>
  );
}
