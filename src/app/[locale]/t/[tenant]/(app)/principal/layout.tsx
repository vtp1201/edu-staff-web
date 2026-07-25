import "server-only";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { decodeRoleClaim } from "@/bootstrap/lib/jwt";
import { evaluateNamespaceAccess } from "@/bootstrap/tenant";

/**
 * Principal-namespace role guard layout (INFRA rsc-layout-guards-role-groups,
 * ADR 0063 follow-up — mirrors `admin/layout.tsx`, US-E12.8/decision 0022/0024).
 * Enforces `role === "principal"` server-side before any `/principal/*` route
 * renders. Non-principal authenticated users redirect to their default route;
 * unauthenticated users redirect to select-tenant.
 */
export default async function PrincipalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; tenant: string }>;
}) {
  const { locale, tenant } = await params;
  const token = await getAccessToken();
  const role = decodeRoleClaim(token ?? "");
  const result = evaluateNamespaceAccess(role, locale, tenant, "principal");

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[principal-guard] verdict=${result.verdict} locale=${locale} tenant=${tenant}`,
    );
  }

  if (result.verdict !== "allowed") {
    redirect(result.redirectUrl);
  }

  return <>{children}</>;
}
