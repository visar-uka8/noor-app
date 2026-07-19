import type { FamilyRoleState } from "@/lib/family-roles";
import type { UserRole } from "@/types/profiles";

/** Account registered only to follow a relative — not a patient account. */
export function isDedicatedFamilyMemberAccount(profileRole: UserRole | null) {
  return profileRole === "family_member";
}

/** @deprecated Use isDedicatedFamilyMemberAccount for nav/layout restrictions. */
export function isFamilyMemberAccount(
  profileRole: UserRole | null,
  _roles: Pick<FamilyRoleState, "isWatcher" | "isPatient">,
) {
  return isDedicatedFamilyMemberAccount(profileRole);
}

/** Dedicated family-only accounts see the watched dashboard on home. */
export function showFamilyDashboardHome(
  profileRole: UserRole | null,
  roles: Pick<FamilyRoleState, "isWatcher">,
) {
  return roles.isWatcher && isDedicatedFamilyMemberAccount(profileRole);
}

/** Registered as family member but not connected yet. */
export function needsFamilyConnect(
  profileRole: UserRole | null,
  roles: Pick<FamilyRoleState, "isWatcher">,
) {
  return profileRole === "family_member" && !roles.isWatcher;
}

export function useFamilyMemberNav(profileRole: UserRole | null) {
  return isDedicatedFamilyMemberAccount(profileRole);
}
