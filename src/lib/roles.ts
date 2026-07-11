import type { UserRole } from "@/types/firestore";

/** Normalize legacy `customer` docs to `client`. */
export function normalizeRole(role: unknown): UserRole {
  if (role === "master" || role === "admin" || role === "client") {
    return role;
  }
  if (role === "customer") {
    return "client";
  }
  return "client";
}

export function isStaffRole(role: UserRole | string | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "master";
}

export function isMasterRole(role: UserRole | string | null | undefined): boolean {
  return normalizeRole(role) === "master";
}

export function isAdminRole(role: UserRole | string | null | undefined): boolean {
  return normalizeRole(role) === "admin";
}
