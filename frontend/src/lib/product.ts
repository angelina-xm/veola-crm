/**
 * Vexora CRM — product vocabulary and routes.
 * User-facing names live here; internal code may still use pipeline* types/APIs.
 */

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

export const NAV_LABELS = {
  dashboard: "Dashboard",
  deals: "Deals",
  clients: "Clients",
  clientDirectory: "Directory",
  clientAll: "All clients",
  clientAnalytics: "Analytics",
  clientLeaderboards: "Leaderboards",
  catalog: "Catalog",
  tasks: "Tasks",
  analytics: "Analytics",
  team: "Team",
  automation: "Automation",
  closedDeals: "Closed deals",
} as const;

/** Short CTAs and cross-links */
export const COPY = {
  backToDeals: "Back to deals",
  openDeals: "Open deals",
  viewDeals: "View deals",
  viewClosedDeals: "View closed deals",
  newDeal: "New deal",
  dealsBoardHint:
    "Active deals on your board. Drag to Won or Lost to close with confirmation.",
  dashboardHint:
    "Your operational cockpit — revenue, deal health, and what needs attention today.",
  closedDealsHint:
    "Won and lost deals — relationship memory, not your active board.",
  analyticsHint:
    "Closed deals and performance — separate from day-to-day deal work.",
  historicalEyebrow: "Historical",
  operationalEyebrow: "Operational",
} as const;

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

export function pageTitleForPath(pathname: string): string {
  if (pathname === ROUTES.dashboard || pathname === "/") return NAV_LABELS.dashboard;
  if (pathname === ROUTES.deals || pathname.startsWith(ROUTES.pipeline))
    return NAV_LABELS.deals;
  if (pathname.startsWith(ROUTES.tasks)) return NAV_LABELS.tasks;
  if (pathname.startsWith(ROUTES.clientsLeaderboards))
    return NAV_LABELS.clientLeaderboards;
  if (pathname.startsWith(ROUTES.clientsAnalytics)) return NAV_LABELS.clientAnalytics;
  if (pathname === ROUTES.clients) return NAV_LABELS.clientDirectory;
  if (pathname.startsWith(ROUTES.clients)) return NAV_LABELS.clients;
  if (pathname.startsWith(ROUTES.products)) return NAV_LABELS.catalog;
  if (pathname.startsWith(ROUTES.dealsClosed)) return NAV_LABELS.closedDeals;
  if (pathname.startsWith(ROUTES.analytics)) return NAV_LABELS.analytics;
  if (pathname.startsWith(ROUTES.team)) return NAV_LABELS.team;
  if (pathname.startsWith(ROUTES.automation)) return "Automation";
  return "Vexora";
}

export function resolveDealsReturnHref(apiHref: string): string {
  if (apiHref === "/" || apiHref === ROUTES.pipeline) return ROUTES.deals;
  return apiHref;
}
