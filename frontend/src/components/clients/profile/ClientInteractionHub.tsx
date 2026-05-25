"use client";

import { useMemo, useState } from "react";
import type { ClientInteractionType } from "@/src/types";
import { defaultDueDatetimeLocal } from "@/src/lib/taskSemantics";
import { useTranslation } from "@/src/context/LocaleContext";

const TYPE_KEYS: { id: ClientInteractionType; key: string }[] = [
  { id: "call", key: "clients.interactionCall" },
  { id: "meeting", key: "clients.interactionMeeting" },
  { id: "note", key: "clients.interactionNote" },
  { id: "follow_up", key: "clients.interactionFollowUp" },
];

const CATEGORY_DEFS = [
  { value: "Pricing", key: "clients.catPricing" },
  { value: "Interest", key: "clients.catInterest" },
  { value: "Objection", key: "clients.catObjection" },
  { value: "Follow up", key: "clients.catFollowUpSpace" },
  { value: "Other", key: "clients.catOther" },
] as const;

const MOOD_DEFS = [
  { value: "", key: "clients.moodNone" },
  { value: "Positive", key: "clients.moodPositive" },
  { value: "Neutral", key: "clients.moodNeutral" },
  { value: "Cautious", key: "clients.moodCautious" },
  { value: "Frustrated", key: "clients.moodFrustrated" },
] as const;

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
  const { t } = useTranslation();
  const types = useMemo(
    () => TYPE_KEYS.map((row) => ({ id: row.id, label: t(row.key) })),
    [t]
  );
  const categories = useMemo(
    () => CATEGORY_DEFS.map((row) => ({ value: row.value, label: t(row.key) })),
    [t]
  );
  const moods = useMemo(
    () => MOOD_DEFS.map((row) => ({ value: row.value, label: t(row.key) })),
    [t]
  );

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
        ? nextStep.trim() || content.trim() || t("clients.catFollowUpSpace")
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
          <h2 className="text-sm font-semibold text-zinc-900">{t("clients.addInteraction")}</h2>
          <p className="mt-0.5 text-xs text-zinc-500">{t("clients.interactionHubHint")}</p>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
        >
          {t("common.close")}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5" role="tablist">
        {types.map((row) => (
          <button
            key={row.id}
            type="button"
            role="tab"
            aria-selected={type === row.id}
            onClick={() => setType(row.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              type === row.id
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {row.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {type !== "follow_up" ? (
          <>
            <label className="block text-xs font-medium text-zinc-600">
              {t("clients.interactionSummary")}
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                placeholder={t("clients.interactionWhat")}
              />
            </label>
            {type === "note" ? (
              <label className="block text-xs font-medium text-zinc-600">
                {t("clients.categoryLabel")}
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600">
            {t("clients.discussedTopics")}
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            {t("clients.moodLabel")}
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
            >
              {moods.map((m) => (
                <option key={m.value || "none"} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs font-medium text-zinc-600">
          {t("clients.concernsLabel")}
          <input
            value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          {t("clients.outcome")}
          <input
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600">
            {t("clients.nextStep")}
            <input
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            {t("clients.followUpDate")}
            <input
              type="date"
              value={followUpOn}
              onChange={(e) => setFollowUpOn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="block text-xs font-medium text-zinc-600">
          {t("clients.relationshipContext")}
          <input
            value={relationshipContext}
            onChange={(e) => setRelationshipContext(e.target.value)}
            placeholder={t("clients.accountPriorities")}
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
          {t("clients.createFollowUpTask")}
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="rounded-lg bg-[var(--vx-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--vx-shadow-accent)] disabled:opacity-50"
        >
          {busy ? t("common.saving") : t("clients.saveInteraction")}
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            onOpenChange(false);
          }}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
        >
          {t("common.cancel")}
        </button>
      </div>
    </section>
  );
}
