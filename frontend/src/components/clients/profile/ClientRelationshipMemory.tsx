"use client";

import { useEffect, useState } from "react";
import type { ClientRelationshipMemory } from "@/src/types";

const MOODS = ["", "Positive", "Neutral", "Cautious", "Frustrated"];

export default function ClientRelationshipMemoryBlock({
  memory,
  onSave,
}: {
  memory: ClientRelationshipMemory;
  onSave: (patch: ClientRelationshipMemory) => Promise<void>;
}) {
  const [draft, setDraft] = useState(memory);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(memory);
  }, [memory]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  };

  const hasContent =
    draft.last_conversation_topic ||
    draft.last_conversation_outcome ||
    draft.next_step;

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
      <h2 className="text-sm font-semibold text-zinc-900">Last conversation</h2>
      <p className="mt-0.5 text-xs text-zinc-500">
        Lightweight memory before the next touch — not a notes archive
      </p>
      {!hasContent ? (
        <p className="mt-3 text-sm text-zinc-500">
          Capture what you discussed so the team picks up with context.
        </p>
      ) : null}
      <div className="mt-4 space-y-3">
        <label className="block text-xs font-medium text-zinc-600">
          What you discussed
          <textarea
            rows={2}
            value={draft.last_conversation_topic}
            onChange={(e) =>
              setDraft({ ...draft, last_conversation_topic: e.target.value })
            }
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Pricing, rollout timeline, competitor mention…"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Client mood
          <select
            value={draft.last_conversation_mood}
            onChange={(e) =>
              setDraft({ ...draft, last_conversation_mood: e.target.value })
            }
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
          >
            {MOODS.map((m) => (
              <option key={m || "none"} value={m}>
                {m || "—"}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          How it ended
          <textarea
            rows={2}
            value={draft.last_conversation_outcome}
            onChange={(e) =>
              setDraft({ ...draft, last_conversation_outcome: e.target.value })
            }
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Next step
          <input
            value={draft.next_step}
            onChange={(e) => setDraft({ ...draft, next_step: e.target.value })}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Send proposal Friday, schedule demo…"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="mt-4 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save memory"}
      </button>
    </section>
  );
}
