"use client";

import type { PipelineHealth } from "@/src/types";

type Props = {
  health: PipelineHealth | null;
  loading?: boolean;
};

export default function PipelineHealthBanner({ health, loading }: Props) {
  if (loading || !health) return null;
  if (health.total_operational === 0) return null;

  const calm =
    health.attention_needed === 0 && health.at_risk === 0;

  return (
    <div
      className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
        calm
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : "border-slate-200 bg-slate-50 text-slate-800"
      }`}
    >
      <p className="font-medium">{health.summary_message}</p>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
        <span>{health.healthy} healthy</span>
        <span>{health.attention_needed} could use attention</span>
        <span>{health.at_risk} quiet a while</span>
        {health.waiting_on_client > 0 ? (
          <span>{health.waiting_on_client} waiting on client</span>
        ) : null}
      </div>
    </div>
  );
}
