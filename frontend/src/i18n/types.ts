export const LOCALES = ["ru", "en", "kk"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ru";

export const LOCALE_STORAGE_KEY = "vexora.locale";

export type LocaleMeta = {
  code: Locale;
  /** Native label in profile switcher */
  label: string;
  /** BCP 47 for Intl / html lang */
  bcp47: string;
};

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  ru: { code: "ru", label: "Русский", bcp47: "ru" },
  en: { code: "en", label: "English", bcp47: "en" },
  kk: { code: "kk", label: "Қазақша", bcp47: "kk" },
};

export function isLocale(value: string | null | undefined): value is Locale {
  return LOCALES.includes(value as Locale);
}
