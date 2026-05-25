"use client";

import { useEffect, useState } from "react";
import { dealCycleDays } from "@/src/lib/pipelineLifecycle";
import { formatDealAmountUsd } from "@/src/lib/dealDisplay";
import type { Deal } from "@/src/types";
import { useTranslation } from "@/src/context/LocaleContext";

export type CloseDealWonPayload = {
  win_reason?: string;
};

type Props = {
  deal: Deal | null;
  open: boolean;
  submitting?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (payload: CloseDealWonPayload) => void | Promise<void>;
};

export default function CloseDealWonModal({
  deal,
  open,
  submitting = false,
  error = null,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const [winReason, setWinReason] = useState("");

  useEffect(() => {
    if (open) setWinReason("");
  }, [open, deal?.id]);

  if (!open || !deal) return null;

  const cycleDays = dealCycleDays(deal);
  const amountLabel = formatDealAmountUsd(deal.amount);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="close-won-title"
    >
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <h2 id="close-won-title" className="text-lg font-semibold text-gray-900">
          {t("pipeline.closeWonQuestion")}
        </h2>
        <p className="mt-1 text-sm text-gray-600">{t("pipeline.closeWonBody")}</p>

        <dl className="mt-4 space-y-2 rounded-lg bg-gray-50 px-4 py-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">{t("pipeline.closeDealLabel")}</dt>
            <dd className="text-right font-medium text-gray-900">{deal.title}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">{t("pipeline.closeAmount")}</dt>
            <dd className="font-medium text-gray-900">
              {amountLabel ?? t("common.notAvailable")}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">{t("pipeline.closeCycle")}</dt>
            <dd className="font-medium text-gray-900">
              {cycleDays === 1
                ? t("clients.cycleDays", { count: cycleDays })
                : t("clients.cycleDaysPlural", { count: cycleDays })}
            </dd>
          </div>
        </dl>

        <label className="mt-4 block text-sm font-medium text-gray-700">
          {t("pipeline.winReasonLabel")}{" "}
          <span className="font-normal text-gray-400">{t("common.optional")}</span>
        </label>
        <textarea
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          rows={2}
          value={winReason}
          onChange={(e) => setWinReason(e.target.value)}
          placeholder={t("pipeline.winReasonPlaceholder")}
          disabled={submitting}
        />

        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() =>
              void onConfirm({
                win_reason: winReason.trim() || undefined,
              })
            }
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {submitting ? t("pipeline.closing") : t("pipeline.confirmClose")}
          </button>
        </div>
      </div>
    </div>
  );
}
