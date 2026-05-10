export type CompanyRole = "owner" | "manager" | "employee";

/** RBAC flags с backend (/api/membership/me/); роль — пресет при создании членства. */
export type MemberPermissions = {
  can_view_all_deals: boolean;
  can_create_deals: boolean;
  can_edit_all_deals: boolean;
  can_delete_deals: boolean;
  can_manage_team: boolean;
  can_manage_automations: boolean;
  can_view_analytics: boolean;
};

export type MembershipProfile = {
  user_id: number;
  company_id: number;
  role: CompanyRole;
  is_active: boolean;
  permissions: MemberPermissions;
};

function fallbackPermissionsFromRole(role: CompanyRole): MemberPermissions {
  if (role === "owner") {
    return {
      can_view_all_deals: true,
      can_create_deals: true,
      can_edit_all_deals: true,
      can_delete_deals: true,
      can_manage_team: true,
      can_manage_automations: true,
      can_view_analytics: true,
    };
  }
  if (role === "manager") {
    return {
      can_view_all_deals: false,
      can_create_deals: true,
      can_edit_all_deals: false,
      can_delete_deals: false,
      can_manage_team: false,
      can_manage_automations: false,
      can_view_analytics: true,
    };
  }
  return {
    can_view_all_deals: false,
    can_create_deals: true,
    can_edit_all_deals: false,
    can_delete_deals: false,
    can_manage_team: false,
    can_manage_automations: false,
    can_view_analytics: false,
  };
}

/** OWNER на backend всегда с полным доступом; иначе читаем флаги. */
export function getEffectivePermissions(
  m: MembershipProfile | null | undefined
): MemberPermissions {
  if (!m?.is_active) {
    return fallbackPermissionsFromRole("employee");
  }
  if (m.role === "owner") {
    return fallbackPermissionsFromRole("owner");
  }
  return m.permissions ?? fallbackPermissionsFromRole(m.role);
}

export function isOwner(role: CompanyRole | null | undefined): boolean {
  return role === "owner";
}

export function canManageTeam(m: MembershipProfile | null | undefined): boolean {
  return getEffectivePermissions(m).can_manage_team;
}

export function canManageAutomations(
  m: MembershipProfile | null | undefined
): boolean {
  return getEffectivePermissions(m).can_manage_automations;
}

export function canViewAnalytics(
  m: MembershipProfile | null | undefined
): boolean {
  return getEffectivePermissions(m).can_view_analytics;
}

export function canCreateDeals(m: MembershipProfile | null | undefined): boolean {
  return getEffectivePermissions(m).can_create_deals;
}

export function canDeleteDeals(m: MembershipProfile | null | undefined): boolean {
  return getEffectivePermissions(m).can_delete_deals;
}

/** Управление сделками в UI: создание и операции «менеджера по своим» — can_create_deals. */
export function canManageDeals(m: MembershipProfile | null | undefined): boolean {
  return getEffectivePermissions(m).can_create_deals;
}
