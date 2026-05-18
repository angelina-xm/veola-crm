"use client";

import { useState } from "react";
import { formatRelative } from "@/src/lib/formatRelative";
import type { ClientRelationshipMemory } from "@/src/types";

const MOOD_CLASS: Record<string, string> = {
  Positive: "bg-emerald-50 text-emerald-800",
  Neutral: "bg-zinc-100 text-zinc-700",
  Cautious: "bg-amber-50 text-amber-900",
  Frustrated: "bg-red-50 text-red-800",
};

export default function ClientRelationshipMemoryBlock({
  memory,
  onSave,
}: {
  memory: ClientRelationshipMemory;
  onSave: (patch: ClientRelationshipMemory) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memory);
  const [saving, setSaving] = useState(false);

  const hasSummary =
    memory.last_conversation_topic ||
    memory.last_conversation_outcome ||
    memory.next_step;

  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
        <h2 className="text-sm font-semibold text-zinc-900">Refine summary</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Adjust memory without logging a new interaction
        </p>
        <div className="mt-4 space-y-3">
          <textarea
            rows={2}
            value={draft.last_conversation_topic}
            onChange={(e) =>
              setDraft({ ...draft, last_conversation_topic: e.target.value })
            }
            placeholder="What you discussed"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <textarea
            rows={2}
            value={draft.last_conversation_outcome}
            onChange={(e) =>
              setDraft({ ...draft, last_conversation_outcome: e.target.value })
            }
            placeholder="How it ended"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <input
            value={draft.next_step}
            onChange={(e) => setDraft({ ...draft, next_step: e.target.value })}
            placeholder="Next step"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(memory);
              setEditing(false);
            }}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700"
          >
            Cancel
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Last conversation</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {memory.last_conversation_at
              ? formatRelative(memory.last_conversation_at)
              : "No touch logged yet"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800"
        >
          Refine
        </button>
      </div>

      {!hasSummary ? (
        <p className="mt-4 text-sm leading-relaxed text-zinc-500">
          Log an interaction from the action bar — this summary updates automatically.
        </p>
      ) : (
        <div className="mt-4 space-y-3 text-sm">
          {memory.last_conversation_mood ? (
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                MOOD_CLASS[memory.last_conversation_mood] ?? MOOD_CLASS.Neutral
              }`}
            >
              {memory.last_conversation_mood}
            </span>
          ) : null}
          {memory.last_conversation_topic ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Discussed
              </p>
              <p className="mt-0.5 text-zinc-800">{memory.last_conversation_topic}</p>
            </div>
          ) : null}
          {memory.last_conversation_outcome ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Outcome
              </p>
              <p className="mt-0.5 text-zinc-700">{memory.last_conversation_outcome}</p>
            </div>
          ) : null}
          {memory.next_step ? (
            <div className="rounded-lg border border-blue-100/80 bg-blue-50/40 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-800/70">
                Next step
              </p>
              <p className="mt-0.5 font-medium text-blue-950">{memory.next_step}</p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
