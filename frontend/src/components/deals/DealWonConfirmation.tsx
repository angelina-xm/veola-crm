"use client";

import Link from "next/link";
import { resolveDealsReturnHref } from "@/src/lib/product";
import { useTranslation } from "@/src/context/LocaleContext";
import { LOCALE_META } from "@/src/i18n/types";
import type { DealCloseTransition } from "@/src/types";

type Props = {
  transition: DealCloseTransition;
  onDismiss: () => void;
};

export default function DealWonConfirmation({ transition, onDismiss }: Props) {
  const { t, locale } = useTranslation();
  const amount = Number.parseFloat(transition.amount);
  const amountLabel = Number.isFinite(amount)
    ? new Intl.NumberFormat(LOCALE_META[locale].bcp47, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(amount)
    : transition.amount;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm">
      <p className="text-sm font-medium text-emerald-800">{t("clients.dealClosed")}</p>
      <h2 className="mt-1 text-lg font-semibold text-gray-900">{transition.title}</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <dt className="text-gray-500">{t("clients.amount")}</dt>
        <dd className="font-medium text-gray-900">{amountLabel}</dd>
        <dt className="text-gray-500">{t("clients.cycle")}</dt>
        <dd className="font-medium text-gray-900">
          {transition.cycle_days === 1
            ? t("clients.cycleDays", { count: transition.cycle_days })
            : t("clients.cycleDaysPlural", { count: transition.cycle_days })}
        </dd>
        {transition.win_reason ? (
          <>
            <dt className="text-gray-500">{t("clients.reason")}</dt>
            <dd className="font-medium text-gray-900">{transition.win_reason}</dd>
          </>
        ) : null}
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={transition.links.view_customer}
          className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
        >
          {t("clients.viewCustomer")}
        </Link>
        <Link
          href={resolveDealsReturnHref(transition.links.back_to_pipeline)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          {t("copy.backToDeals")}
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          className="px-2 py-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          {t("clients.dismiss")}
        </button>
      </div>
    </div>
  );
}
