"use client";

import { useMembership } from "@/src/context/MembershipContext";
import { useTranslation } from "@/src/context/LocaleContext";
import { LOCALE_META } from "@/src/i18n/types";

function greetingForHour(h: number, t: (k: string) => string): string {
  if (h < 12) return t("greeting.morning");
  if (h < 17) return t("greeting.afternoon");
  return t("greeting.evening");
}

export default function DashboardWelcome() {
  const { membership } = useMembership();
  const { t, locale } = useTranslation();
  const name =
    membership?.user_display_name?.split(/\s+/)[0] ?? t("dashboard.there");
  const now = new Date();
  const dateLabel = now.toLocaleDateString(LOCALE_META[locale].bcp47, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--vx-text)]">
          {greetingForHour(now.getHours(), t)}, {name}
        </h1>
        <p className="mt-1 text-sm text-[var(--vx-text-muted)]">
          {t("copy.dashboardWelcome")}
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-[var(--vx-border)] bg-[var(--vx-surface)] px-3 py-1.5 text-xs text-[var(--vx-text-secondary)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="4"
            y="5"
            width="16"
            height="15"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        {dateLabel}
      </div>
    </div>
  );
}
