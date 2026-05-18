"use client";

type Props = {
  devUnlock?: boolean;
  className?: string;
};

export default function ProBadge({ devUnlock = false, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 ${className}`}
    >
      Pro
      {devUnlock ? (
        <span className="normal-case tracking-normal text-violet-600/90">
          · dev
        </span>
      ) : null}
    </span>
  );
}
