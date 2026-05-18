"use client";

import { useEffect, useState } from "react";
import type { ClientBusinessContext as BusinessContext } from "@/src/types";

const RELATIONSHIP_LABEL: Record<string, string> = {
  preferred: "Preferred",
  frequent: "Frequent",
  recent: "Recent",
  interested: "Interested",
};

export function relationshipLabel(key: string): string {
  return RELATIONSHIP_LABEL[key] ?? key;
}

export default function ClientBusinessContextPanel({
  context,
  metricsStrip,
  editing,
  onStartEdit,
  onSave,
  onCancel,
}: {
  context: BusinessContext;
  metricsStrip?: React.ReactNode;
  editing: boolean;
  onStartEdit: () => void;
  onSave: (patch: Partial<BusinessContext>) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(context);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(context);
  }, [context]);

  const chips = [
    context.industry && { label: "Industry", value: context.industry },
    context.market_sector && { label: "Sector", value: context.market_sector },
    context.company_size && { label: "Size", value: context.company_size },
  ].filter(Boolean) as { label: string; value: string }[];

  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-zinc-100/80 bg-zinc-50/40 px-6 py-5 sm:px-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Business context
          </h2>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            What they do, what they sell, how your team works with them
          </p>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={onStartEdit}
            className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Edit
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field
            label="Industry"
            value={draft.industry}
            onChange={(v) => setDraft({ ...draft, industry: v })}
          />
          <Field
            label="Market / sector"
            value={draft.market_sector}
            onChange={(v) => setDraft({ ...draft, market_sector: v })}
          />
          <div className="sm:col-span-2">
            <Field
              label="What they do"
              value={draft.description}
              onChange={(v) => setDraft({ ...draft, description: v })}
              multiline
            />
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Products & services they offer"
              value={draft.products_services}
              onChange={(v) => setDraft({ ...draft, products_services: v })}
              multiline
            />
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Internal team notes"
              value={draft.internal_context}
              onChange={(v) => setDraft({ ...draft, internal_context: v })}
              multiline
              placeholder="e.g. Wholesale packaging · prefers fast delivery · 2 account managers"
            />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save context"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {chips.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-200/80 bg-white px-2.5 py-1 text-[11px] text-zinc-700"
                >
                  <span className="text-zinc-400">{c.label}</span>
                  {c.value}
                </span>
              ))}
            </div>
          ) : null}
          {context.description ? (
            <p className="mt-3 text-sm leading-relaxed text-zinc-700">
              {context.description}
            </p>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">
              Add a short description so anyone opening this client knows what they do.
            </p>
          )}
          {context.products_services ? (
            <p className="mt-2 text-sm text-zinc-600">
              <span className="font-medium text-zinc-500">Sells: </span>
              {context.products_services}
            </p>
          ) : null}
          {context.internal_context ? (
            <p className="mt-3 rounded-lg border border-amber-100/80 bg-amber-50/50 px-3 py-2 text-sm text-amber-950/90">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/80">
                Team context
              </span>
              <span className="mt-1 block">{context.internal_context}</span>
            </p>
          ) : null}
        </>
      )}

      {metricsStrip ? <div className="mt-5 border-t border-zinc-100/80 pt-4">{metricsStrip}</div> : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-medium text-zinc-600">
      {label}
      {multiline ? (
        <textarea
          rows={2}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
      ) : (
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
      )}
    </label>
  );
}
