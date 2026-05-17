"use client";

import { useEffect, useState } from "react";
import { dealCycleDays } from "@/src/lib/pipelineLifecycle";
import { formatDealAmountUsd } from "@/src/lib/dealDisplay";
import type { Deal } from "@/src/types";

export type CloseDealLostPayload = {
  loss_reason: string;
  close_competitor?: string;
  close_notes?: string;
};

type Props = {
  deal: Deal | null;
  open: boolean;
  submitting?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (payload: CloseDealLostPayload) => void | Promise<void>;
};

export default function CloseDealLostModal({
  deal,
  open,
  submitting = false,
  error = null,
  onCancel,
  onConfirm,
}: Props) {
  const [lossReason, setLossReason] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setLossReason("");
      setCompetitor("");
      setNotes("");
    }
  }, [open, deal?.id]);

  if (!open || !deal) return null;

  const cycleDays = dealCycleDays(deal);
  const amountLabel = formatDealAmountUsd(deal.amount);
  const canSubmit = lossReason.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="close-lost-title"
    >
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <h2 id="close-lost-title" className="text-lg font-semibold text-gray-900">
          Close deal as lost?
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          The deal will leave your active board. Loss reason is required.
        </p>

        <dl className="mt-4 space-y-2 rounded-lg bg-gray-50 px-4 py-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Deal</dt>
            <dd className="text-right font-medium text-gray-900">{deal.title}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Amount</dt>
            <dd className="font-medium text-gray-900">{amountLabel ?? "-"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Cycle</dt>
            <dd className="font-medium text-gray-900">
              {cycleDays} day{cycleDays === 1 ? "" : "s"}
            </dd>
          </div>
        </dl>

        <label className="mt-4 block text-sm font-medium text-gray-700">
          Loss reason <span className="text-red-600">*</span>
        </label>
        <textarea
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          rows={2}
          value={lossReason}
          onChange={(e) => setLossReason(e.target.value)}
          placeholder="Why was this deal lost?"
          disabled={submitting}
          required
        />

        <label className="mt-3 block text-sm font-medium text-gray-700">
          Competitor <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={competitor}
          onChange={(e) => setCompetitor(e.target.value)}
          disabled={submitting}
        />

        <label className="mt-3 block text-sm font-medium text-gray-700">
          Notes <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
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
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || !canSubmit}
            onClick={() =>
              void onConfirm({
                loss_reason: lossReason.trim(),
                close_competitor: competitor.trim() || undefined,
                close_notes: notes.trim() || undefined,
              })
            }
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900 disabled:opacity-50"
          >
            {submitting ? "Closing..." : "Confirm close"}
          </button>
        </div>
      </div>
    </div>
  );
}
