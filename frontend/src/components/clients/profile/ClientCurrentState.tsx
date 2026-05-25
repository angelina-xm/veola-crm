"use client";

import Link from "next/link";
import { ROUTES } from "@/src/lib/product";
import { formatMoney } from "@/src/lib/formatRelative";
import type { ClientOperationalDeal, ClientOperationalTask } from "@/src/types";
import { useTranslation } from "@/src/context/LocaleContext";
import { translateStageName } from "@/src/lib/i18nHelpers";

export default function ClientCurrentState({
  deals,
  tasks,
}: {
  deals: ClientOperationalDeal[];
  tasks: ClientOperationalTask[];
}) {
  const { t } = useTranslation();

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
      <h2 className="text-sm font-semibold text-zinc-900">{t("clients.rightNowTitle")}</h2>
      <p className="mt-0.5 text-xs text-zinc-500">{t("clients.rightNowHint")}</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            {t("clients.activeDeals")}
          </h3>
          {deals.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">{t("clients.noOpenDeals")}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {deals.map((d) => (
                <li
                  key={d.id}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/50 px-3 py-2.5"
                >
                  <p className="truncate text-sm font-medium text-zinc-900">{d.title}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {translateStageName(d.stage_name)}
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
            {t("clients.openDealsBoard")}
          </Link>
        </div>
        <div className="min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            {t("common.viewTasks")}
          </h3>
          {tasks.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">{t("clients.noOpenTasks")}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/50 px-3 py-2.5"
                >
                  <p className="text-sm text-zinc-800">{task.content}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {task.deal_title ?? t("clients.clientTaskFallback")}
                    {task.assigned_to_email ? ` · ${task.assigned_to_email}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={ROUTES.tasks}
            className="mt-2 inline-block text-xs font-medium text-[var(--vx-accent)]"
          >
            {t("clients.viewTasksLink")}
          </Link>
        </div>
      </div>
    </section>
  );
}
