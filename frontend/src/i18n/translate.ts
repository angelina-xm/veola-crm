import { enMessages } from "@/src/i18n/messages/en";
import { kkMessages } from "@/src/i18n/messages/kk";
import { ruMessages } from "@/src/i18n/messages/ru";
import type { Locale } from "@/src/i18n/types";
import { DEFAULT_LOCALE } from "@/src/i18n/types";

type StringTree = { [key: string]: string | StringTree };

/** Locale catalogs mirror en structure; values are localized strings. */
export type Messages = typeof enMessages & StringTree;
export type TranslationParams = Record<string, string | number>;

const CATALOG: Record<Locale, Messages> = {
  ru: ruMessages as Messages,
  en: enMessages,
  kk: kkMessages as Messages,
};

let runtimeLocale: Locale = DEFAULT_LOCALE;

export function setRuntimeLocale(locale: Locale): void {
  runtimeLocale = locale;
}

export function getRuntimeLocale(): Locale {
  return runtimeLocale;
}

function getByPath(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function interpolate(
  template: string,
  params?: TranslationParams
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = params[key];
    return v === undefined ? `{${key}}` : String(v);
  });
}

/** Translate by dot-path key; works outside React via runtime locale. */
export function translate(
  key: string,
  params?: TranslationParams,
  locale: Locale = runtimeLocale
): string {
  const raw =
    getByPath(CATALOG[locale], key) ??
    getByPath(CATALOG[DEFAULT_LOCALE], key) ??
    getByPath(CATALOG.en, key);
  if (raw == null) return key;
  return interpolate(raw, params);
}

/** Shorthand for translate — same as `t` in hooks. */
export const t = translate;
