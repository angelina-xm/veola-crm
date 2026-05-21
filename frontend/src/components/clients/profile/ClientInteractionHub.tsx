"use client";

import { useState } from "react";
import type { ClientInteractionType } from "@/src/types";
import { defaultDueDatetimeLocal } from "@/src/lib/taskSemantics";

const TYPES: { id: ClientInteractionType; label: string }[] = [
  { id: "call", label: "Call" },
  { id: "meeting", label: "Meeting" },
  { id: "note", label: "Note" },
  { id: "follow_up", label: "Follow-up" },
];

const CATEGORIES = ["Pricing", "Interest", "Objection", "Follow up", "Other"];
const MOODS = ["", "Positive", "Neutral", "Cautious", "Frustrated"];

export default function ClientInteractionHub({
  open,
  onOpenChange,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  onSubmit: (payload: {
    interaction_type: ClientInteractionType;
    content: string;
    category: string;
    topic: string;
    mood: string;
    outcome: string;
    next_step: string;
    concerns: string;
    relationship_context: string;
    follow_up_on: string | null;
    schedule_follow_up: boolean;
    follow_up_due: string | null;
  }) => Promise<void>;
}) {
  const [type, setType] = useState<ClientInteractionType>("call");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Follow up");
  const [topic, setTopic] = useState("");
  const [mood, setMood] = useState("");
  const [outcome, setOutcome] = useState("");
  const [concerns, setConcerns] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [relationshipContext, setRelationshipContext] = useState("");
  const [followUpOn, setFollowUpOn] = useState("");
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);

  const reset = () => {
    setContent("");
    setTopic("");
    setOutcome("");
    setConcerns("");
    setNextStep("");
    setRelationshipContext("");
    setFollowUpOn("");
    setScheduleFollowUp(false);
  };

  const submit = async () => {
    const body =
      type === "follow_up"
        ? nextStep.trim() || content.trim() || "Follow up"
        : content.trim();
    if (!body) return;
    await onSubmit({
      interaction_type: type,
      content: body,
      category,
      topic: topic.trim() || body.slice(0, 280),
      mood,
      outcome,
      next_step: nextStep,
      concerns,
      relationship_context: relationshipContext,
      follow_up_on: followUpOn || null,
      schedule_follow_up: scheduleFollowUp || type === "follow_up",
      follow_up_due: scheduleFollowUp
        ? new Date(defaultDueDatetimeLocal()).toISOString()
        : null,
    });
    reset();
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Log interaction</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            One object → timeline, memory, and optional follow-up task
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
        >
          Close
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5" role="tablist">
        {TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={type === t.id}
            onClick={() => setType(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              type === t.id
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {type !== "follow_up" ? (
          <>
            <label className="block text-xs font-medium text-zinc-600">
              Summary
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                placeholder="What happened — feeds timeline"
              />
            </label>
            {type === "note" ? (
              <label className="block text-xs font-medium text-zinc-600">
                Category
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600">
            Discussed topics
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Mood
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
            >
              {MOODS.map((m) => (
                <option key={m || "none"} value={m}>
                  {m || "—"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs font-medium text-zinc-600">
          Concerns / objections
          <input
            value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Outcome
          <input
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600">
            Next step
            <input
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Follow-up date
            <input
              type="date"
              value={followUpOn}
              onChange={(e) => setFollowUpOn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="block text-xs font-medium text-zinc-600">
          Relationship context
          <input
            value={relationshipContext}
            onChange={(e) => setRelationshipContext(e.target.value)}
            placeholder="Ongoing priorities for this account"
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-600">
          <input
            type="checkbox"
            checked={scheduleFollowUp || type === "follow_up"}
            onChange={(e) => setScheduleFollowUp(e.target.checked)}
            disabled={type === "follow_up"}
          />
          Create follow-up task
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="rounded-lg bg-[var(--vx-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--vx-shadow-accent)] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save interaction"}
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            onOpenChange(false);
          }}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
