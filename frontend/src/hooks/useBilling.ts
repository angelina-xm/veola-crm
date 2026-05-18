"use client";

import { useMemo } from "react";
import { useMembership } from "@/src/context/MembershipContext";
import {
  isProFeatureLocked,
  resolveBillingEntitlements,
  showProPaywall,
  type BillingEntitlements,
  type ProFeatureKey,
} from "@/src/lib/billing";

export function useBilling(): {
  entitlements: BillingEntitlements;
  isLocked: (feature: ProFeatureKey) => boolean;
  paywallMode: boolean;
} {
  const { membership } = useMembership();

  const entitlements = useMemo(
    () => resolveBillingEntitlements(membership?.company_plan),
    [membership?.company_plan]
  );

  return useMemo(
    () => ({
      entitlements,
      isLocked: (feature: ProFeatureKey) =>
        isProFeatureLocked(entitlements, feature),
      paywallMode: showProPaywall(entitlements),
    }),
    [entitlements]
  );
}
