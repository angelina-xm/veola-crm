"use client";

import { useState } from "react";
import {
  postDealInactivityAction,
  type InactivityAction,
} from "@/src/lib/api";
import type { Deal, StaleDeal } from "@/src/types";

type Props = {
  companyId: number;
  deal: Deal;
  staleRow?: StaleDeal | null;
  disabled?: boolean;
  onMutated?: () => void | Promise<void>;
  onMoveToLost?: () => void;
};

const WAITING_PRESETS = [
  "Proposal sent",
  "Awaiting signature",
  "Client reviewing",
];

export default function DealInactivityPanel({
  companyId,
  deal,
  staleRow,
  disabled,
  onMutated,
  onMoveToLost,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWaitingForm, setShowWaitingForm] = useState(false);
  const [waitingReason, setWaitingReason] = useState(
    deal.waiting_reason || WAITING_PRESETS[0]
  );
  const [followUpDate, setFollowUpDate] = useState("");

  const inactiveDays =
    staleRow && staleRow.last_activity
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(staleRow.last_activity).getTime()) /
              86400000
          )
        )
      : staleRow
        ? Math.max(
            0,
            Math.floor(
              (Date.now() - new Date(deal.created_at || 0).getTime()) /
                86400000
            )
          )
        : 0;

  const showPanel = Boolean(staleRow) || deal.waiting_on_client;

  if (!showPanel) return null;

  const run = async (
    action: InactivityAction,
    extra?: {
      waiting_reason?: string;
      follow_up_on?: string;
      days?: number;
      content?: string;
    }
  ) => {
    setBusy(true);
    setError(null);
    try {
      await postDealInactivityAction(companyId, deal.id, {
        action,
        ...extra,
      });
      await onMutated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  if (deal.waiting_on_client) {
    return (
      <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-950">
        <p className="font-medium">
          Waiting on client
          {deal.waiting_reason ? ` — ${deal.waiting_reason}` : ""}
        </p>
        {deal.follow_up_on ? (
          <p className="mt-1 text-xs text-sky-800">
            Follow up on {new Date(deal.follow_up_on).toLocaleDateString()}
          </p>
        ) : null}
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => void run("clear_waiting")}
          className="mt-2 rounded border border-sky-300 bg-white px-2 py-1 text-xs hover:bg-sky-100 disabled:opacity-50"
        >
          Resume inactivity tracking
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800">
      <p className="font-medium">
        {inactiveDays > 0
          ? `Quiet for about ${inactiveDays} day${inactiveDays === 1 ? "" : "s"} — a gentle check-in may help`
          : "No recent activity — worth a quick look when you have a moment"}
      </p>
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => void run("add_follow_up")}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
        >
          Add follow-up
        </button>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => void run("log_call")}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
        >
          Log call
        </button>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => setShowWaitingForm((v) => !v)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
        >
          Waiting on client
        </button>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => void run("snooze", { days: 3 })}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
        >
          Snooze 3 days
        </button>
        {onMoveToLost ? (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={onMoveToLost}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Move to Lost
          </button>
        ) : null}
      </div>
      {showWaitingForm ? (
        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
          <label className="block text-xs text-slate-600">
            Reason
            <select
              value={waitingReason}
              onChange={(e) => setWaitingReason(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            >
              {WAITING_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-600">
            Remind me on (optional)
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() =>
              void run("waiting_on_client", {
                waiting_reason: waitingReason,
                follow_up_on: followUpDate
                  ? new Date(followUpDate).toISOString()
                  : undefined,
              })
            }
            className="rounded bg-sky-600 px-3 py-1 text-xs text-white hover:bg-sky-700 disabled:opacity-50"
          >
            Save waiting state
          </button>
        </div>
      ) : null}
    </div>
  );
}

