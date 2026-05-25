"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { translate, setRuntimeLocale } from "@/src/i18n/translate";
import type { TranslationParams } from "@/src/i18n/translate";
import {
  DEFAULT_LOCALE,
  LOCALE_META,
  LOCALE_STORAGE_KEY,
  isLocale,
  type Locale,
} from "@/src/i18n/types";

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(raw) ? raw : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: TranslationParams) => string;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredLocale();
    setLocaleState(stored);
    setRuntimeLocale(stored);
    setHydrated(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setRuntimeLocale(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore quota */
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = LOCALE_META[next].bcp47;
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setRuntimeLocale(locale);
    if (typeof document !== "undefined") {
      document.documentElement.lang = LOCALE_META[locale].bcp47;
    }
  }, [locale, hydrated]);

  const t = useCallback(
    (key: string, params?: TranslationParams) => translate(key, params, locale),
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within <LocaleProvider>");
  }
  return ctx;
}

/** Translation hook — instant UI updates on locale change. */
export function useTranslation() {
  const { locale, setLocale, t } = useLocale();
  return { locale, setLocale, t };
}
