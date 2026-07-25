import "server-only";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { decodeRoleClaim } from "@/bootstrap/lib/jwt";
import { evaluateNamespaceAccess } from "@/bootstrap/tenant";

/**
 * Parent-namespace role guard layout (INFRA rsc-layout-guards-role-groups,
 * ADR 0063 follow-up — mirrors `admin/layout.tsx`, US-E12.8/decision 0022/0024).
 * Enforces `role === "parent"` server-side before any `/parent/*` route
 * renders. Non-parent authenticated users redirect to their default route;
 * unauthenticated users redirect to select-tenant.
 */
export default async function ParentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; tenant: string }>;
}) {
  const { locale, tenant } = await params;
  const token = await getAccessToken();
  const role = decodeRoleClaim(token ?? "");
  const result = evaluateNamespaceAccess(role, locale, tenant, "parent");

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[parent-guard] verdict=${result.verdict} locale=${locale} tenant=${tenant}`,
    );
  }

  if (result.verdict !== "allowed") {
    redirect(result.redirectUrl);
  }

  return <>{children}</>;
}
