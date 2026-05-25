"use client";

import { useEffect } from "react";
import { useLocale } from "@/src/context/LocaleContext";
import { LOCALE_META } from "@/src/i18n/types";

/** Syncs document lang after hydration without full page reload. */
export default function LocaleHtmlLang() {
  const { locale } = useLocale();

  useEffect(() => {
    document.documentElement.lang = LOCALE_META[locale].bcp47;
  }, [locale]);

  return null;
}
