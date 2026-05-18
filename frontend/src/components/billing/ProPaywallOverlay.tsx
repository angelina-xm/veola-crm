"use client";

type Props = {
  title: string;
  description: string;
  onUpgradeClick?: () => void;
};

export default function ProPaywallOverlay({
  title,
  description,
  onUpgradeClick,
}: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/75 px-6 text-center backdrop-blur-[1px]">
      <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
        Pro
      </span>
      <p className="mt-3 max-w-xs text-sm font-medium text-zinc-900">{title}</p>
      <p className="mt-1 text-xs text-zinc-500">{description}</p>
      <button
        type="button"
        onClick={onUpgradeClick}
        className="mt-4 rounded-xl bg-[var(--vx-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--vx-shadow-accent)] transition hover:opacity-95"
      >
        Upgrade to Pro
      </button>
      <p className="mt-3 text-[10px] text-zinc-400">
        Billing launches with production — explore layout in dev via{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[9px]">
          PRO_FEATURES_ENABLED
        </code>
      </p>
    </div>
  );
}
