/**
 * Billing / subscription entitlements — UI gates only for now.
 *
 * Production path: `company_plan` from membership + Stripe-updated plan on Company.
 * Dev path: NEXT_PUBLIC_PRO_FEATURES_ENABLED=true unlocks Pro without paywall blocks.
 */

export type BillingPlan = "free" | "pro" | "business";

export type ProFeatureKey =
  | "workspaceAnalytics"
  | "clientDeepAnalytics"
  | "exportReports";

export type BillingEntitlements = {
  plan: BillingPlan;
  devUnlock: boolean;
  workspaceAnalytics: boolean;
  clientDeepAnalytics: boolean;
  exportReports: boolean;
};

export function readProFeaturesDevFlag(): boolean {
  return process.env.NEXT_PUBLIC_PRO_FEATURES_ENABLED === "true";
}

export function normalizeBillingPlan(raw: unknown): BillingPlan {
  const p = String(raw ?? "free").toLowerCase();
  if (p === "pro" || p === "business") return p;
  return "free";
}

/** Entitlements from a paid plan (no dev override). */
export function entitlementsForPlan(plan: BillingPlan): BillingEntitlements {
  const isPaid = plan === "pro" || plan === "business";
  return {
    plan,
    devUnlock: false,
    workspaceAnalytics: isPaid,
    clientDeepAnalytics: isPaid,
    exportReports: isPaid,
  };
}

/**
 * Effective entitlements for the current session.
 * Dev unlock grants feature access but keeps `plan` for honest UI labeling.
 */
export function resolveBillingEntitlements(
  companyPlan?: string | null
): BillingEntitlements {
  const plan = normalizeBillingPlan(companyPlan);
  const devUnlock = readProFeaturesDevFlag();

  if (devUnlock) {
    return {
      plan,
      devUnlock: true,
      workspaceAnalytics: true,
      clientDeepAnalytics: true,
      exportReports: true,
    };
  }

  return entitlementsForPlan(plan);
}

export function isProFeatureLocked(
  entitlements: BillingEntitlements,
  feature: ProFeatureKey
): boolean {
  return !entitlements[feature];
}

export function showProPaywall(entitlements: BillingEntitlements): boolean {
  return !entitlements.devUnlock && entitlements.plan === "free";
}
