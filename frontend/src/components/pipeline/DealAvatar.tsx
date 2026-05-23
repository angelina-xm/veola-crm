"use client";

import { cn } from "@/src/lib/cn";
import { initialsFromLabel } from "@/src/lib/nav";

const TONES = {
  client: "bg-[var(--vx-accent-soft)] text-[var(--vx-accent)] ring-[var(--vx-accent)]/15",
  assignee: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/20",
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
  size?: "sm" | "md";
  title?: string;
}) {
  const initials = initialsFromLabel(label || "?");
  return (
    <span
      title={title ?? label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1",
        TONES[tone],
        size === "sm" ? "h-6 w-6 text-[9px]" : "h-8 w-8 text-[10px]"
      )}
    >
      {initials}
    </span>
  );
}
