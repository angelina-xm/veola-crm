"use client";

import Link from "next/link";
import { cn } from "@/src/lib/cn";
import ProBadge from "@/src/components/billing/ProBadge";

function IconLock() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 11V8a5 5 0 0110 0v3M6 11h12v10H6V11z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PremiumNavChild({
  href,
  label,
  active,
  locked,
  lockHint,
  devUnlock,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  locked: boolean;
  lockHint: string;
  devUnlock?: boolean;
  onNavigate?: () => void;
}) {
  const className = cn(
    "flex items-center gap-2 rounded-lg py-1.5 pl-2.5 pr-2 text-[12px] font-medium transition-all duration-150",
    locked
      ? active
        ? "border-l-2 border-violet-300/80 bg-violet-50/40 text-zinc-600 -ml-px pl-[calc(0.625rem-1px)]"
        : "text-zinc-400 hover:bg-zinc-50/60"
      : active
        ? "border-l-2 border-[var(--vx-accent)] bg-zinc-50 text-zinc-900 -ml-px pl-[calc(0.625rem-1px)]"
        : "text-zinc-500 hover:bg-zinc-50/80 hover:text-zinc-800"
  );

  const inner = (
    <>
      <span className="min-w-0 flex-1">{label}</span>
      {locked ? (
        <span className="flex shrink-0 items-center gap-1" title={lockHint}>
          <IconLock />
          <ProBadge devUnlock={devUnlock} className="!px-1.5 !py-0 text-[9px]" />
        </span>
      ) : null}
    </>
  );

  if (locked) {
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className={className}
        title={lockHint}
        aria-disabled={false}
      >
        {inner}
      </Link>
    );
  }

  return (
    <Link href={href} onClick={onNavigate} className={className}>
      {inner}
    </Link>
  );
}
