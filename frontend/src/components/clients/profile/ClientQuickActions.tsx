"use client";

import Link from "next/link";
import { ROUTES } from "@/src/lib/product";
import { useTranslation } from "@/src/context/LocaleContext";

export default function ClientQuickActions({
  clientId,
  hasPrimaryContact,
  onAddInteraction,
  onAddTask,
}: {
  clientId: string;
  hasPrimaryContact: boolean;
  onAddInteraction: () => void;
  onAddTask: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onAddInteraction}
        className="inline-flex items-center rounded-xl bg-[var(--vx-accent)] px-3.5 py-2 text-sm font-semibold text-white shadow-[var(--vx-shadow-accent)] hover:bg-[var(--vx-accent-hover)]"
      >
        {t("clients.addInteraction")}
      </button>
      <Link
        href={`${ROUTES.deals}?client=${clientId}`}
        className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
      >
        {t("copy.newDeal")}
      </Link>
      <button
        type="button"
        onClick={onAddTask}
        className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
      >
        {t("common.createTask")}
      </button>
      <button
        type="button"
        onClick={() => {
          document.getElementById("client-contacts")?.scrollIntoView({
            behavior: "smooth",
          });
        }}
        className={
          !hasPrimaryContact
            ? "inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
            : "inline-flex items-center rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
        }
      >
        {hasPrimaryContact ? t("clients.contacts") : t("clients.addPrimaryContact")}
      </button>
    </div>
  );
}
