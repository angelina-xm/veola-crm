"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TaskPreset } from "@/src/lib/quickTask";

const ITEMS: { preset: TaskPreset; label: string }[] = [
  { preset: "call_client", label: "Call client" },
  { preset: "send_proposal", label: "Send proposal" },
  { preset: "schedule_meeting", label: "Schedule meeting" },
  { preset: "custom", label: "Custom task" },
];

type Props = {
  disabled?: boolean;
  busy?: boolean;
  onSelect: (preset: TaskPreset, customContent?: string) => void;
};

export default function DealQuickTaskMenu({
  disabled = false,
  busy = false,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleItem = useCallback(
    (preset: TaskPreset) => {
      if (busy || disabled) return;
      setOpen(false);
      if (preset === "custom") {
        if (typeof window === "undefined") return;
        const text = window.prompt("Task description", "");
        if (text === null) return;
        const trimmed = text.trim();
        if (!trimmed) return;
        onSelect(preset, trimmed);
        return;
      }
      onSelect(preset);
    },
    [busy, disabled, onSelect]
  );

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="vx-btn-ghost text-[11px]"
        disabled={busy || disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={(e) => {
          e.stopPropagation();
          if (busy || disabled) return;
          setOpen((v) => !v);
        }}
      >
        {busy ? "…" : "Task"}
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-20 mt-1.5 min-w-[11rem] overflow-hidden rounded-xl border border-[var(--vx-border)] bg-[var(--vx-surface-raised)] py-1 shadow-lg"
        >
          {ITEMS.map(({ preset, label }) => (
            <li key={preset}>
              <button
                type="button"
                role="option"
                className="flex w-full cursor-pointer px-3 py-2 text-left text-[12px] text-[var(--vx-text-secondary)] transition-colors hover:bg-[var(--vx-bg-subtle)] hover:text-[var(--vx-text)]"
                onClick={(e) => {
                  e.stopPropagation();
                  handleItem(preset);
                }}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
