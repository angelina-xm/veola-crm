"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TaskPreset } from "@/src/lib/quickTask";

const ITEMS: { preset: TaskPreset; label: string; icon: string }[] = [
  { preset: "call_client", label: "Call client", icon: "📞" },
  { preset: "send_proposal", label: "Send proposal", icon: "📧" },
  { preset: "schedule_meeting", label: "Schedule meeting", icon: "📅" },
  { preset: "custom", label: "Custom task", icon: "➕" },
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
        className="cursor-pointer rounded border border-sky-500 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-900 shadow-sm hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={busy || disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={(e) => {
          e.stopPropagation();
          if (busy || disabled) return;
          setOpen((v) => !v);
        }}
      >
        {busy ? "…" : "➕ Add task"}
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-20 mt-1 min-w-[12rem] rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {ITEMS.map(({ preset, label, icon }) => (
            <li key={preset}>
              <button
                type="button"
                role="option"
                className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left text-xs text-gray-800 hover:bg-sky-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleItem(preset);
                }}
              >
                <span aria-hidden className="shrink-0">
                  {icon}
                </span>
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
