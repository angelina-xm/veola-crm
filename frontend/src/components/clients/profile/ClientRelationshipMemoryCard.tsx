"use client";

import { useEffect, useState } from "react";
import { formatRelative } from "@/src/lib/formatRelative";
import type { ClientRelationshipMemory } from "@/src/types";

const MOOD_CLASS: Record<string, string> = {
  Positive: "bg-emerald-50 text-emerald-800",
  Neutral: "bg-zinc-100 text-zinc-700",
  Cautious: "bg-amber-50 text-amber-900",
  Frustrated: "bg-red-50 text-red-800",
};

function MemoryField({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  if (!value.trim()) return null;
  return (
    <div
      className={
        accent
          ? "rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2.5"
          : undefined
      }
    >
      <p
        className={
          accent
            ? "text-[10px] font-semibold uppercase tracking-wide text-violet-700/80"
            : "text-[10px] font-semibold uppercase tracking-wide text-zinc-400"
        }
      >
        {label}
      </p>
      <p
        className={
          accent
            ? "mt-0.5 font-medium text-violet-950"
            : "mt-0.5 leading-relaxed text-zinc-800"
        }
      >
        {value}
      </p>
    </div>
  );
}

export default function ClientRelationshipMemoryCard({
  memory,
  onSave,
  interactionFormOpen,
}: {
  memory: ClientRelationshipMemory;
  onSave?: (patch: ClientRelationshipMemory) => Promise<void>;
  /** When true, hint points at open interaction form */
  interactionFormOpen?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memory);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(memory);
  }, [memory, editing]);

  const hasContent =
    memory.last_conversation_topic ||
    memory.last_conversation_outcome ||
    memory.next_step ||
    memory.relationship_concerns ||
    memory.relationship_context ||
    memory.follow_up_on;

  const save = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing && onSave) {
    return (
      <section className="vx-card p-5">
        <h2 className="text-sm font-semibold text-[var(--vx-text)]">Relationship memory</h2>
        <p className="mt-0.5 text-xs text-[var(--vx-text-muted)]">
          Structured fields — synced when you log interactions
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600 sm:col-span-2">
            Discussed topics
            <input
              value={draft.last_conversation_topic}
              onChange={(e) =>
                setDraft({ ...draft, last_conversation_topic: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600 sm:col-span-2">
            Concerns / objections
            <input
              value={draft.relationship_concerns}
              onChange={(e) =>
                setDraft({ ...draft, relationship_concerns: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600 sm:col-span-2">
            How it ended
            <input
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
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Follow-up date
            <input
              type="date"
              value={draft.follow_up_on?.slice(0, 10) ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  follow_up_on: e.target.value || null,
                })
              }
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600 sm:col-span-2">
            Relationship context
            <input
              value={draft.relationship_context}
              onChange={(e) =>
                setDraft({ ...draft, relationship_context: e.target.value })
              }
              placeholder="Priorities, sensitivities, buying patterns…"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-4 flex gap-2">
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
    <section className="vx-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Relationship memory</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {memory.last_conversation_at
              ? `Last interaction ${formatRelative(memory.last_conversation_at)}`
              : "Populated when you log an interaction"}
          </p>
        </div>
        {onSave ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800"
          >
            Refine
          </button>
        ) : null}
      </div>

      {!hasContent ? (
        <p className="mt-4 text-sm leading-relaxed text-zinc-500">
          {interactionFormOpen
            ? "Complete the interaction form — memory and timeline update together."
            : "Use Add interaction above — one flow updates timeline and this memory."}
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
          <MemoryField label="Discussed" value={memory.last_conversation_topic} />
          <MemoryField label="Concerns" value={memory.relationship_concerns} />
          <MemoryField label="Outcome" value={memory.last_conversation_outcome} />
          <MemoryField label="Next step" value={memory.next_step} accent />
          {memory.follow_up_on ? (
            <p className="text-xs text-zinc-500">
              Follow-up:{" "}
              <span className="font-medium text-zinc-700">
                {new Date(memory.follow_up_on).toLocaleDateString()}
              </span>
            </p>
          ) : null}
          <MemoryField
            label="Relationship context"
            value={memory.relationship_context}
          />
        </div>
      )}
    </section>
  );
}
