"use client";

import Link from "next/link";
import { ROUTES } from "@/src/lib/product";

type Action = {
  key: string;
  label: string;
  onClick?: () => void;
  href?: string;
  highlight?: boolean;
};

export default function ClientQuickActions({
  clientId,
  hasPrimaryContact,
  onAddNote,
  onLogCall,
  onAddTask,
}: {
  clientId: string;
  hasPrimaryContact: boolean;
  onAddNote: () => void;
  onLogCall: () => void;
  onAddTask: () => void;
}) {
  const actions: Action[] = [
    {
      key: "deal",
      label: "New deal",
      href: `${ROUTES.deals}?client=${clientId}`,
    },
    { key: "note", label: "Add note", onClick: onAddNote },
    { key: "task", label: "Add task", onClick: onAddTask },
    { key: "call", label: "Log call", onClick: onLogCall },
    {
      key: "contact",
      label: hasPrimaryContact ? "Add contact" : "Add primary contact",
      onClick: () => {
        document.getElementById("client-contacts")?.scrollIntoView({
          behavior: "smooth",
        });
      },
      highlight: !hasPrimaryContact,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) =>
        a.href ? (
          <Link
            key={a.key}
            href={a.href}
            className="inline-flex items-center rounded-xl bg-[var(--vx-accent)] px-3.5 py-2 text-sm font-semibold text-white shadow-[var(--vx-shadow-accent)] hover:bg-[var(--vx-accent-hover)]"
          >
            {a.label}
          </Link>
        ) : (
          <button
            key={a.key}
            type="button"
            onClick={a.onClick}
            className={
              a.highlight
                ? "inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
                : "inline-flex items-center rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
            }
          >
            {a.label}
          </button>
        )
      )}
    </div>
  );
}

