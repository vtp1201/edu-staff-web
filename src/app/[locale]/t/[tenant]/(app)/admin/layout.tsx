import "server-only";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { decodeRoleClaim } from "@/bootstrap/lib/jwt";
import { evaluateAdminAccess } from "@/bootstrap/tenant";

/**
 * Admin-namespace role guard layout (US-E12.8, decision 0022/0024).
 * Enforces `role === "admin"` server-side before any `/admin/*` route renders.
 * Non-admin authenticated users redirect to their default route;
 * unauthenticated users redirect to select-tenant.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; tenant: string }>;
}) {
  const { locale, tenant } = await params;
  const token = await getAccessToken();
  const role = decodeRoleClaim(token ?? "");
  const result = evaluateAdminAccess(role, locale, tenant);

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[admin-guard] verdict=${result.verdict} locale=${locale} tenant=${tenant}`,
    );
  }

  if (result.verdict !== "allowed") {
    redirect(result.redirectUrl);
  }

  return <>{children}</>;
}
