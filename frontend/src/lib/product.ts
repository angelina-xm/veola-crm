/**
 * Vexora CRM — routes and i18n key helpers.
 * User-facing copy lives in src/i18n/messages/* — use useTranslation() in UI.
 */

import { translate } from "@/src/i18n/translate";
import type { TranslationParams } from "@/src/i18n/translate";

export const ROUTES = {
  dashboard: "/dashboard",
  deals: "/deals",
  dealsClosed: "/deals/closed",
  clients: "/clients",
  clientsAnalytics: "/clients/analytics",
  clientsLeaderboards: "/clients/leaderboards",
  products: "/products",
  tasks: "/tasks",
  analytics: "/analytics",
  team: "/team",
  automation: "/settings/automation",
  /** Legacy alias — redirects to deals */
  pipeline: "/pipeline",
} as const;

export type TranslateFn = (key: string, params?: TranslationParams) => string;

/** @deprecated Use t("nav.*") via useTranslation() */
export function navLabels(t: TranslateFn = translate) {
  return {
    dashboard: t("nav.dashboard"),
    deals: t("nav.deals"),
    clients: t("nav.clients"),
    clientDirectory: t("nav.clientDirectory"),
    clientAll: t("nav.clientAll"),
    clientAnalytics: t("nav.clientAnalytics"),
    clientLeaderboards: t("nav.clientLeaderboards"),
    catalog: t("nav.catalog"),
    tasks: t("nav.tasks"),
    analytics: t("nav.analytics"),
    team: t("nav.team"),
    automation: t("nav.automation"),
    closedDeals: t("nav.closedDeals"),
  };
}

/** @deprecated Use t("copy.*") via useTranslation() */
export function copyStrings(t: TranslateFn = translate) {
  return {
    backToDeals: t("copy.backToDeals"),
    openDeals: t("copy.openDeals"),
    viewDeals: t("copy.viewDeals"),
    viewClosedDeals: t("copy.viewClosedDeals"),
    newDeal: t("copy.newDeal"),
    dealsBoardHint: t("copy.dealsBoardHint"),
    dashboardWelcome: t("copy.dashboardWelcome"),
    dashboardHint: t("copy.dashboardHint"),
    closedDealsHint: t("copy.closedDealsHint"),
    analyticsHint: t("copy.analyticsHint"),
    historicalEyebrow: t("copy.historicalEyebrow"),
    operationalEyebrow: t("copy.operationalEyebrow"),
  };
}

/** Back-compat shims — prefer useTranslation in components */
export const NAV_LABELS = new Proxy({} as ReturnType<typeof navLabels>, {
  get(_t, prop: string) {
    return translate(`nav.${prop}`);
  },
});

export const COPY = new Proxy({} as ReturnType<typeof copyStrings>, {
  get(_t, prop: string) {
    return translate(`copy.${prop}`);
  },
});

export function initialsFromLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return label.slice(0, 2).toUpperCase() || "?";
}

export function pageTitleForPath(pathname: string, t: TranslateFn = translate): string {
  if (pathname === ROUTES.dashboard || pathname === "/") return t("nav.dashboard");
  if (pathname === ROUTES.deals || pathname.startsWith(ROUTES.pipeline))
    return t("nav.deals");
  if (pathname.startsWith(ROUTES.tasks)) return t("nav.tasks");
  if (pathname.startsWith(ROUTES.clientsLeaderboards))
    return t("nav.clientLeaderboards");
  if (pathname.startsWith(ROUTES.clientsAnalytics)) return t("nav.clientAnalytics");
  if (pathname === ROUTES.clients) return t("nav.clientDirectory");
  if (pathname.startsWith(ROUTES.clients)) return t("nav.clients");
  if (pathname.startsWith(ROUTES.products)) return t("nav.catalog");
  if (pathname.startsWith(ROUTES.dealsClosed)) return t("nav.closedDeals");
  if (pathname.startsWith(ROUTES.analytics)) return t("nav.analytics");
  if (pathname.startsWith(ROUTES.team)) return t("nav.team");
  if (pathname.startsWith(ROUTES.automation)) return t("settings.automationTitle");
  return "Vexora";
}

export function resolveDealsReturnHref(apiHref: string): string {
  if (apiHref === "/" || apiHref === ROUTES.pipeline) return ROUTES.deals;
  return apiHref;
}
