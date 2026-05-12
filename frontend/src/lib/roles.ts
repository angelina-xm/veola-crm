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

/** До загрузки membership / неактивный пользователь — без прав (кнопки CRM выключены). */
const NO_MEMBER_ACCESS: MemberPermissions = {
  can_view_all_deals: false,
  can_create_deals: false,
  can_edit_all_deals: false,
  can_delete_deals: false,
  can_manage_team: false,
  can_manage_automations: false,
  can_view_analytics: false,
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

export function memberPermissionsFromMeResponse(
  raw: Record<string, unknown>,
  role: CompanyRole
): MemberPermissions {
  const pick = (key: keyof MemberPermissions): boolean | undefined => {
    const v = raw[key as string];
    return typeof v === "boolean" ? v : undefined;
  };
  const partial: Partial<MemberPermissions> = {
    can_view_all_deals: pick("can_view_all_deals"),
    can_create_deals: pick("can_create_deals"),
    can_edit_all_deals: pick("can_edit_all_deals"),
    can_delete_deals: pick("can_delete_deals"),
    can_manage_team: pick("can_manage_team"),
    can_manage_automations: pick("can_manage_automations"),
    can_view_analytics: pick("can_view_analytics"),
  };
  return mergePermissionsFromApi(partial, role);
}

function mergePermissionsFromApi(
  perms: Partial<MemberPermissions> | undefined,
  role: CompanyRole
): MemberPermissions {
  const fb = fallbackPermissionsFromRole(role);
  if (!perms) return fb;
  return {
    can_view_all_deals:
      perms.can_view_all_deals ?? fb.can_view_all_deals,
    can_create_deals:
      perms.can_create_deals ?? fb.can_create_deals,
    can_edit_all_deals:
      perms.can_edit_all_deals ?? fb.can_edit_all_deals,
    can_delete_deals:
      perms.can_delete_deals ?? fb.can_delete_deals,
    can_manage_team: perms.can_manage_team ?? fb.can_manage_team,
    can_manage_automations:
      perms.can_manage_automations ?? fb.can_manage_automations,
    can_view_analytics:
      perms.can_view_analytics ?? fb.can_view_analytics,
  };
}

/** OWNER = полный пресет; иначе флаги из API с fallback по роли (если поля отсутствуют в JSON). */
export function getEffectivePermissions(
  m: MembershipProfile | null | undefined
): MemberPermissions {
  if (m == null) {
    return NO_MEMBER_ACCESS;
  }
  if (!m.is_active) {
    return NO_MEMBER_ACCESS;
  }
  if (m.role === "owner") {
    return fallbackPermissionsFromRole("owner");
  }
  return mergePermissionsFromApi(m.permissions, m.role);
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
