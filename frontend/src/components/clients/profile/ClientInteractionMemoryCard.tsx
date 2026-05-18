"use client";

import { formatRelative } from "@/src/lib/formatRelative";
import type { ClientRelationshipMemory } from "@/src/types";

const MOOD_CLASS: Record<string, string> = {
  Positive: "bg-emerald-50 text-emerald-800",
  Neutral: "bg-zinc-100 text-zinc-700",
  Cautious: "bg-amber-50 text-amber-900",
  Frustrated: "bg-red-50 text-red-800",
};

export default function ClientInteractionMemoryCard({
  memory,
}: {
  memory: ClientRelationshipMemory;
}) {
  const hasTouch = Boolean(memory.last_conversation_at);
  const hasSummary =
    memory.last_conversation_topic ||
    memory.last_conversation_outcome ||
    memory.next_step;

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Interaction memory</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          {hasTouch
            ? `Last touch ${formatRelative(memory.last_conversation_at!)}`
            : "No interactions logged yet"}
        </p>
      </div>

      {!hasSummary ? (
        <p className="mt-4 text-sm leading-relaxed text-zinc-500">
          Log a call, meeting, or note from the action bar above — timeline and
          relationship memory stay in sync automatically.
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
                Recent topic
              </p>
              <p className="mt-0.5 text-zinc-800">{memory.last_conversation_topic}</p>
            </div>
          ) : null}
          {memory.last_conversation_outcome ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                How it ended
              </p>
              <p className="mt-0.5 text-zinc-700">{memory.last_conversation_outcome}</p>
            </div>
          ) : null}
          {memory.next_step ? (
            <div className="rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700/80">
                Suggested follow-up
              </p>
              <p className="mt-0.5 font-medium text-violet-950">{memory.next_step}</p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
