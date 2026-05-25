"use client";

import { cn } from "@/src/lib/cn";
import { useTranslation } from "@/src/context/LocaleContext";
import { useTheme } from "@/src/context/ThemeContext";
import type { ThemeMode } from "@/src/lib/theme";

function IconSun({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMoon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 14.5A8.5 8.5 0 019.5 4 8.5 8.5 0 1014.5 20 7 7 0 0020 14.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThemeToggleRow({ onSelect }: { onSelect?: () => void }) {
  const { mode, resolved, setMode } = useTheme();
  const { t } = useTranslation();

  const options: { id: ThemeMode; label: string }[] = [
    { id: "dark", label: t("theme.dark") },
    { id: "light", label: t("theme.light") },
    { id: "system", label: t("theme.system") },
  ];

  return (
    <div className="border-t border-[var(--vx-border-subtle)] px-2 py-2">
      <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--vx-text-muted)]">
        {t("theme.appearance")}
      </p>
      <div className="flex gap-1 rounded-lg bg-[var(--vx-bg-subtle)] p-1">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              setMode(opt.id);
              onSelect?.();
            }}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
              mode === opt.id
                ? "bg-[var(--vx-surface)] text-[var(--vx-text)] shadow-sm"
                : "text-[var(--vx-text-muted)] hover:text-[var(--vx-text-secondary)]"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 px-2 text-[10px] text-[var(--vx-text-muted)]">
        {t("theme.activeResolved", {
          mode: resolved === "dark" ? t("theme.dark") : t("theme.light"),
        })}
      </p>
    </div>
  );
}

/** Inline Light / Dark control (reference topbar) */
export function ThemeSegmentedToggle({ className }: { className?: string }) {
  const { mode, resolved, setMode } = useTheme();
  const { t } = useTranslation();

  const pick = (next: "light" | "dark") => {
    setMode(next);
  };

  return (
    <div
      className={cn(
        "hidden items-center rounded-lg border border-[var(--vx-border)] bg-[var(--vx-bg-subtle)] p-0.5 sm:flex",
        className
      )}
      role="group"
      aria-label={t("theme.themeGroup")}
    >
      {(["light", "dark"] as const).map((themeId) => (
        <button
          key={themeId}
          type="button"
          onClick={() => pick(themeId)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
            (mode === themeId || (mode === "system" && resolved === themeId))
              ? "bg-[var(--vx-surface)] text-[var(--vx-text)] shadow-sm"
              : "text-[var(--vx-text-muted)] hover:text-[var(--vx-text-secondary)]"
          )}
        >
          {themeId === "light" ? t("theme.light") : t("theme.dark")}
        </button>
      ))}
    </div>
  );
}

export function ThemeToggleIcon({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  const { resolved, toggle } = useTheme();
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={() => {
        toggle();
        onClick?.();
      }}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--vx-border)] bg-[var(--vx-surface)] text-[var(--vx-text-secondary)] transition-colors hover:bg-[var(--vx-bg-subtle)] hover:text-[var(--vx-text)]",
        className
      )}
      aria-label={
        resolved === "dark" ? t("theme.switchToLight") : t("theme.switchToDark")
      }
    >
      {resolved === "dark" ? <IconSun /> : <IconMoon />}
    </button>
  );
}
