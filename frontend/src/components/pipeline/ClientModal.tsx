"use client";

import { useState } from "react";

type ClientModalProps = {
  open: boolean;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: { name: string; email: string }) => void | Promise<void>;
};

export default function ClientModal({
  open,
  submitting,
  error,
  onClose,
  onSubmit,
}: ClientModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget && !submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-modal-title"
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="client-modal-title" className="text-lg font-semibold text-gray-900">
            Create client
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            void onSubmit({ name: name.trim(), email: email.trim() });
          }}
          className="space-y-3"
        >
          {error ? (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          ) : null}
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={submitting}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {submitting ? "Loading..." : "Create"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
