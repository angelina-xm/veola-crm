"use client";

import Link from "next/link";
import { cn } from "@/src/lib/cn";
import { ROUTES } from "@/src/lib/product";
import { useTranslation } from "@/src/context/LocaleContext";

type Action = {
  href: string;
  label: string;
  icon: React.ReactNode;
  iconClass: string;
};

function IconArrow() {
  return (
    <svg
      className="shrink-0 text-[var(--vx-text-muted)] opacity-60"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function DashboardQuickActions() {
  const { t } = useTranslation();

  const actions: Action[] = [
    {
      href: ROUTES.deals,
      label: t("copy.newDeal"),
      iconClass: "bg-[var(--vx-accent-muted)] text-[var(--vx-accent)]",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 7h6M14 7h6M4 12h4M10 12h10M4 17h8M14 17h6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      href: ROUTES.clients,
      label: t("common.addClient"),
      iconClass: "vx-badge-success",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M16 11a4 4 0 10-8 0M4 20a8 8 0 0116 0"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      href: `${ROUTES.tasks}?create=1`,
      label: t("common.createTask"),
      iconClass: "vx-badge-success",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M9 11l2 2 4-4M7 4h10a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      href: ROUTES.clients,
      label: t("common.logInteraction"),
      iconClass: "vx-badge-warning",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 4h4l2 5-3 2a11 11 0 005 5l2-3 5v4H6V4z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <section className="vx-card p-4">
      <h2 className="text-[13px] font-semibold text-[var(--vx-text)]">
        {t("dashboard.quickActions")}
      </h2>
      <ul className="mt-3 space-y-1.5">
        {actions.map((action) => (
          <li key={action.href + action.label}>
            <Link
              href={action.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg bg-[var(--vx-bg-subtle)] px-2.5 py-2",
                "transition-colors hover:bg-[var(--vx-nav-active-bg)]"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px]",
                  action.iconClass
                )}
              >
                {action.icon}
              </span>
              <span className="min-w-0 flex-1 text-[13px] font-medium text-[var(--vx-text)]">
                {action.label}
              </span>
              <IconArrow />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
