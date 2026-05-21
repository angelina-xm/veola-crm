"use client";

import { useState } from "react";
import { cn } from "@/src/lib/cn";
import {
  CLIENT_RELATIONSHIP_STATUSES,
  relationshipStatusLabel,
  STATUS_CLASS,
} from "@/src/lib/clientRelationship";
import type { ClientRelationshipStatus } from "@/src/types";

export default function ClientRelationshipStatusSelect({
  value,
  onChange,
}: {
  value: ClientRelationshipStatus;
  onChange: (status: ClientRelationshipStatus) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const handleChange = async (next: ClientRelationshipStatus) => {
    if (next === value) return;
    setBusy(true);
    try {
      await onChange(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-[var(--vx-shadow-card)]">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Customer state
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">
        Relationship layer — works with signals, tasks, and analytics
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {CLIENT_RELATIONSHIP_STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            disabled={busy}
            onClick={() => void handleChange(s.value)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
              value === s.value
                ? STATUS_CLASS[s.value] ?? STATUS_CLASS.active
                : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-zinc-400">
        Current: {relationshipStatusLabel(value)}
      </p>
    </div>
  );
}
