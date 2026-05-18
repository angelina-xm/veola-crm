"use client";

import Link from "next/link";
import { ROUTES } from "@/src/lib/product";
import { formatMoney } from "@/src/lib/formatRelative";
import type { ClientOperationalDeal, ClientOperationalTask } from "@/src/types";

export default function ClientCurrentState({
  deals,
  tasks,
}: {
  deals: ClientOperationalDeal[];
  tasks: ClientOperationalTask[];
}) {
  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
      <h2 className="text-sm font-semibold text-zinc-900">Right now</h2>
      <p className="mt-0.5 text-xs text-zinc-500">
        Active deals and open follow-ups — operational, not history
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Active deals
          </h3>
          {deals.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">No open deals.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {deals.map((d) => (
                <li
                  key={d.id}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/50 px-3 py-2.5"
                >
                  <p className="text-sm font-medium text-zinc-900">{d.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {d.stage_name}
                    {d.amount ? ` · ${formatMoney(d.amount)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={ROUTES.deals}
            className="mt-2 inline-block text-xs font-medium text-[var(--vx-accent)]"
          >
            Open deals board →
          </Link>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Open tasks
          </h3>
          {tasks.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">No open tasks linked.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/50 px-3 py-2.5"
                >
                  <p className="text-sm text-zinc-800">{t.content}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {t.deal_title ?? "Client task"}
                    {t.assigned_to_email ? ` · ${t.assigned_to_email}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={ROUTES.tasks}
            className="mt-2 inline-block text-xs font-medium text-[var(--vx-accent)]"
          >
            View tasks →
          </Link>
        </div>
      </div>
    </section>
  );
}

