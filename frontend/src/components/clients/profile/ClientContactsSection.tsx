"use client";

import { useState } from "react";
import { cn } from "@/src/lib/cn";
import type { ClientContact } from "@/src/types";

const EMPTY: Omit<ClientContact, "id"> = {
  full_name: "",
  role_title: "",
  email: "",
  phone: "",
  preferred_contact_method: "email",
  notes: "",
  is_primary: false,
};

export default function ClientContactsSection({
  contacts,
  onSave,
  onDelete,
}: {
  contacts: ClientContact[];
  onSave: (payload: Omit<ClientContact, "id"> & { id?: number }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState<
    (Omit<ClientContact, "id"> & { id?: number }) | null
  >(null);
  const [busy, setBusy] = useState(false);

  const startAdd = () => setEditing({ ...EMPTY, is_primary: contacts.length === 0 });

  const submit = async () => {
    if (!editing?.full_name.trim()) return;
    setBusy(true);
    try {
      await onSave(editing);
      setEditing(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      id="client-contacts"
      className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">People</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Decision makers and day-to-day contacts at this account
          </p>
        </div>
        <button
          type="button"
          onClick={startAdd}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Add contact
        </button>
      </div>

      {contacts.length === 0 && !editing ? (
        <p className="mt-4 rounded-xl border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-500">
          No contacts yet. Add someone who owns the relationship on their side.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {contacts.map((c) => (
            <li
              key={c.id}
              className={cn(
                "flex flex-wrap items-start justify-between gap-3 rounded-xl border px-4 py-3",
                c.is_primary
                  ? "border-blue-200 bg-blue-50/30"
                  : "border-zinc-100 bg-zinc-50/30"
              )}
            >
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {c.full_name}
                  {c.is_primary ? (
                    <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                      Primary
                    </span>
                  ) : null}
                </p>
                {c.role_title ? (
                  <p className="text-xs text-zinc-500">{c.role_title}</p>
                ) : null}
                <p className="mt-1 text-xs text-zinc-500">
                  {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="text-xs text-zinc-600 hover:text-zinc-900"
                  onClick={() => setEditing(c)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-xs text-rose-600 hover:text-rose-800"
                  onClick={() => void onDelete(c.id)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
          <p className="text-xs font-semibold text-zinc-700">
            {editing.id ? "Edit contact" : "New contact"}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              placeholder="Full name"
              value={editing.full_name}
              onChange={(e) => setEditing({ ...editing, full_name: e.target.value })}
              className="rounded-lg border border-zinc-200 px-2 py-2 text-sm sm:col-span-2"
            />
            <input
              placeholder="Role / title"
              value={editing.role_title}
              onChange={(e) => setEditing({ ...editing, role_title: e.target.value })}
              className="rounded-lg border border-zinc-200 px-2 py-2 text-sm"
            />
            <input
              placeholder="Email"
              value={editing.email}
              onChange={(e) => setEditing({ ...editing, email: e.target.value })}
              className="rounded-lg border border-zinc-200 px-2 py-2 text-sm"
            />
            <input
              placeholder="Phone"
              value={editing.phone}
              onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
              className="rounded-lg border border-zinc-200 px-2 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-xs text-zinc-600 sm:col-span-2">
              <input
                type="checkbox"
                checked={editing.is_primary}
                onChange={(e) =>
                  setEditing({ ...editing, is_primary: e.target.checked })
                }
              />
              Primary contact
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg px-3 py-1.5 text-xs text-zinc-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

