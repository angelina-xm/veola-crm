import { getRuntimeLocale } from "@/src/i18n/translate";
import { translate } from "@/src/i18n/translate";
import { LOCALE_META, type Locale } from "@/src/i18n/types";

function intlLocale(): string {
  const code = getRuntimeLocale();
  return LOCALE_META[code as Locale]?.bcp47 ?? "ru";
}

/** Human-readable relative time for CRM feeds. */
export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return translate("time.justNow");
  const min = Math.floor(sec / 60);
  if (min < 60) return translate("time.minAgo", { count: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return translate("time.hrAgo", { count: hr });
  const day = Math.floor(hr / 24);
  if (day < 7) return translate("time.dayAgo", { count: day });
  return new Date(iso).toLocaleDateString(intlLocale(), {
    month: "short",
    day: "numeric",
  });
}

export function formatMoney(value: string | number, currency = "USD"): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return translate("common.notAvailable");
  return new Intl.NumberFormat(intlLocale(), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}
