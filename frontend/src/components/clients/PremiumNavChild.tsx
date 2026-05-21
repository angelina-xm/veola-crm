"use client";

import Link from "next/link";
import { cn } from "@/src/lib/cn";
import ProBadge from "@/src/components/billing/ProBadge";

function IconLock() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    "flex items-center gap-2 rounded-md py-1.5 pl-2 pr-1.5 text-[12px] font-medium transition-colors",
    locked
      ? active
        ? "-ml-px border-l-2 border-[var(--vx-accent)]/40 bg-[var(--vx-accent-soft)] text-[var(--vx-text-secondary)] pl-[calc(0.5rem-1px)]"
        : "text-[var(--vx-text-muted)] hover:bg-[var(--vx-bg-subtle)]"
      : active
        ? "-ml-px border-l-2 border-[var(--vx-accent)] bg-[var(--vx-nav-active-bg)] text-[var(--vx-text)] pl-[calc(0.5rem-1px)]"
        : "text-[var(--vx-text-secondary)] hover:bg-[var(--vx-bg-subtle)] hover:text-[var(--vx-text)]"
  );

  const inner = (
    <>
      <span className="min-w-0 flex-1">{label}</span>
      {locked ? (
        <span className="flex shrink-0 items-center gap-1 opacity-80" title={lockHint}>
          <IconLock />
          <ProBadge devUnlock={devUnlock} className="!px-1.5 !py-0 text-[9px]" />
        </span>
      ) : null}
    </>
  );

  return (
    <Link href={href} onClick={onNavigate} className={className} title={locked ? lockHint : undefined}>
      {inner}
    </Link>
  );
}
