"use client";

import { cn } from "@/src/lib/cn";
import { initialsFromLabel } from "@/src/lib/nav";

const TONES = {
  client: "bg-[var(--vx-accent-soft)] text-[var(--vx-accent)] ring-[var(--vx-accent)]/15",
  assignee:
    "bg-gradient-to-br from-zinc-600/40 to-zinc-700/30 text-zinc-200 ring-zinc-500/25",
  neutral: "bg-[var(--vx-bg-subtle)] text-[var(--vx-text-secondary)] ring-[var(--vx-border-subtle)]",
} as const;

export default function DealAvatar({
  label,
  tone = "neutral",
  size = "md",
  title,
}: {
  label: string;
  tone?: keyof typeof TONES;
  size?: "sm" | "md" | "lg";
  title?: string;
}) {
  const initials = initialsFromLabel(label || "?");
  return (
    <span
      title={title ?? label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1",
        TONES[tone],
        size === "sm" && "h-6 w-6 text-[9px]",
        size === "md" && "h-8 w-8 text-[10px]",
        size === "lg" && "h-10 w-10 text-[11px]"
      )}
    >
      {initials}
    </span>
  );
}
