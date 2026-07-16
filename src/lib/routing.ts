import { normalizeRole, isMasterRole } from "@/lib/roles";
import type { UserRole } from "@/types/firestore";

/** Post-login / home destination by role. */
export function homeForRole(role: UserRole | string | null | undefined): string {
  const normalized = normalizeRole(role);

  if (normalized === "master") return "/master";
  if (normalized === "admin") return "/admin";
  return "/booking";
}

export function canAccessAdmin(
  role: UserRole | string | null | undefined,
): boolean {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "master";
}

export function canAccessMaster(
  role: UserRole | string | null | undefined,
): boolean {
  return isMasterRole(role);
}
