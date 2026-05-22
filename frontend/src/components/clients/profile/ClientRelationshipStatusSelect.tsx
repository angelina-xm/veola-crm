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
    <div className="vx-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--vx-text-muted)]">
        Relationship state
      </p>
      <p className="mt-0.5 text-xs text-[var(--vx-text-muted)]">
        Human business state — separate from deal stages
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
                : "bg-[var(--vx-bg-subtle)] text-[var(--vx-text-muted)] hover:bg-[var(--vx-nav-active-bg)]"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-[var(--vx-text-muted)]">
        Current: {relationshipStatusLabel(value)}
      </p>
    </div>
  );
}
