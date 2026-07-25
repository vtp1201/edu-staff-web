/**
 * Namespace-level role guard (US-E12.8, decision 0022/0024; generalized —
 * INFRA rsc-layout-guards-role-groups, ADR 0063 follow-up). Pure + testable;
 * wired in each role namespace's `layout.tsx` (RSC): `admin`, `principal`,
 * `teacher`, `student`, `parent`.
 *
 * `evaluateNamespaceAccess` is the single generic implementation — every
 * namespace layout calls it with its own `requiredRole`, deny-by-default
 * (role !== requiredRole → redirected, never rendered). `evaluateAdminAccess`
 * is kept as a thin, behavior-identical wrapper so existing call sites/tests
 * (US-E12.8) do not need to change.
 */
import { DEFAULT_ROUTE } from "@/components/layout/app-shell/sidebar/nav-config";
import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";
import { tenantUrl } from "./tenant-url";

export type NamespaceAccessVerdict =
  | "allowed"
  | "redirect-to-default"
  | "redirect-to-auth";

export interface NamespaceAccessResult {
  verdict: NamespaceAccessVerdict;
  /** Empty string when verdict is "allowed". */
  redirectUrl: string;
}

/** @deprecated kept as an alias — use {@link NamespaceAccessVerdict}. */
export type AdminAccessVerdict = NamespaceAccessVerdict;
/** @deprecated kept as an alias — use {@link NamespaceAccessResult}. */
export type AdminAccessResult = NamespaceAccessResult;

export function evaluateNamespaceAccess(
  role: UserRole | null,
  locale: string,
  tenantId: string,
  requiredRole: UserRole,
): NamespaceAccessResult {
  if (role === requiredRole) {
    return { verdict: "allowed", redirectUrl: "" };
  }

  if (role === null) {
    return {
      verdict: "redirect-to-auth",
      redirectUrl: `/${locale}/select-tenant`,
    };
  }

  return {
    verdict: "redirect-to-default",
    redirectUrl: `/${locale}${tenantUrl(tenantId, DEFAULT_ROUTE[role])}`,
  };
}

export function evaluateAdminAccess(
  role: UserRole | null,
  locale: string,
  tenantId: string,
): NamespaceAccessResult {
  return evaluateNamespaceAccess(role, locale, tenantId, "admin");
}
