export type CompanyRole = "owner" | "manager" | "employee";

export type MembershipProfile = {
  user_id: number;
  company_id: number;
  role: CompanyRole;
  is_active: boolean;
};

export function isOwner(role: CompanyRole | null | undefined): boolean {
  return role === "owner";
}

export function isManager(role: CompanyRole | null | undefined): boolean {
  return role === "manager";
}

export function isEmployee(role: CompanyRole | null | undefined): boolean {
  return role === "employee";
}

export function canManageTeam(role: CompanyRole | null | undefined): boolean {
  return isOwner(role);
}

export function canViewAllDeals(role: CompanyRole | null | undefined): boolean {
  return isOwner(role);
}

export function canManageDeals(role: CompanyRole | null | undefined): boolean {
  return isOwner(role) || isManager(role);
}

export function canDeleteDeals(role: CompanyRole | null | undefined): boolean {
  return isOwner(role);
}

export function canEditAutomationSettings(
  role: CompanyRole | null | undefined
): boolean {
  return isOwner(role);
}
