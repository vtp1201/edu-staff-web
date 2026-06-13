/**
 * Admin-namespace role guard (US-E12.8, decision 0022/0024).
 * Pure + testable; wired in admin/layout.tsx (RSC).
 */
import { DEFAULT_ROUTE } from "@/components/layout/app-shell/sidebar/nav-config";
import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";
import { tenantUrl } from "./tenant-url";

export type AdminAccessVerdict =
  | "allowed"
  | "redirect-to-default"
  | "redirect-to-auth";

export interface AdminAccessResult {
  verdict: AdminAccessVerdict;
  /** Empty string when verdict is "allowed". */
  redirectUrl: string;
}

export function evaluateAdminAccess(
  role: UserRole | null,
  locale: string,
  tenantId: string,
): AdminAccessResult {
  if (role === "admin") {
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
