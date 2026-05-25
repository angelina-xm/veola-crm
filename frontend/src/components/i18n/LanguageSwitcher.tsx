"use client";

import { cn } from "@/src/lib/cn";
import { useTranslation } from "@/src/context/LocaleContext";
import { LOCALE_META, LOCALES, type Locale } from "@/src/i18n/types";

export function LanguageSwitcherRow({ onSelect }: { onSelect?: () => void }) {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div className="border-t border-[var(--vx-border-subtle)] px-2 py-2">
      <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--vx-text-muted)]">
        {t("language.section")}
      </p>
      <div className="flex flex-col gap-0.5">
        {LOCALES.map((code) => {
          const meta = LOCALE_META[code as Locale];
          const active = locale === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => {
                setLocale(code);
                onSelect?.();
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                active
                  ? "bg-[var(--vx-accent-muted)] font-medium text-[var(--vx-accent)]"
                  : "text-[var(--vx-text-secondary)] hover:bg-[var(--vx-bg-subtle)]"
              )}
              aria-pressed={active}
            >
              <span>{meta.label}</span>
              {active ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  className="shrink-0 text-[var(--vx-accent)]"
                >
                  <path
                    d="M5 12l4 4L19 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
