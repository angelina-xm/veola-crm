"use client";

export default function ClientAnalyticsPro() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[var(--vx-shadow-card)]">
      <div className="pointer-events-none select-none p-6 blur-[2px]">
        <h2 className="text-sm font-semibold text-zinc-900">Client analytics</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[72, 48, 86].map((h, i) => (
            <div
              key={i}
              className="flex items-end rounded-lg bg-zinc-100 px-2 pb-1 pt-6"
            >
              <div
                className="w-full rounded bg-blue-200/80"
                style={{ height: `${h}px` }}
              />
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          Revenue trend · deal velocity · engagement score
        </p>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/75 px-6 text-center backdrop-blur-[1px]">
        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
          Pro
        </span>
        <p className="mt-3 max-w-xs text-sm font-medium text-zinc-900">
          Deep client analytics — trends, cohorts, and forecast-ready insights
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Unlock per-account revenue curves and team engagement benchmarks.
        </p>
        <button
          type="button"
          className="mt-4 rounded-xl bg-[var(--vx-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--vx-shadow-accent)]"
        >
          Upgrade to Pro
        </button>
      </div>
    </section>
  );
}
