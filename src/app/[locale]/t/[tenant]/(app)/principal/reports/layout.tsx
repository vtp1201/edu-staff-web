import "server-only";
import { redirect } from "next/navigation";
import { evaluateAccess } from "@/bootstrap/auth-guard";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { decodeRoleClaim, decodeTenantId } from "@/bootstrap/lib/jwt";
import { tenantUrl } from "@/bootstrap/tenant";
import { DEFAULT_ROUTE } from "@/components/layout/app-shell/sidebar/nav-config";

/**
 * Principal-only route guard scoped to `(app)/principal/reports/*` (FR-001 /
 * NFR-007, UC-06). Reuses the generic `evaluateAccess` with
 * `requiredRoles: ["principal"]` (plan.md D-1) rather than a bespoke evaluator.
 * `(app)/layout.tsx` has already validated auth + tenant membership before this
 * nested layout runs; this only re-derives the role and enforces the role gate.
 *
 * Scoped ONLY to this subtree — sibling principal routes (teachers, discipline,
 * class-log, …) are unaffected.
 */
export default async function PrincipalReportsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; tenant: string }>;
}) {
  const { locale, tenant } = await params;
  const token = await getAccessToken();
  const role = decodeRoleClaim(token ?? "");

  // Mock-first: mock tokens carry no real tenantId; pass urlTenantId to skip
  // the mismatch check (matches (app)/layout.tsx).
  const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
  const tokenTenantId = USE_MOCK ? tenant : decodeTenantId(token ?? "");

  const verdict = evaluateAccess({
    role,
    tokenTenantId,
    urlTenantId: tenant,
    requiredRoles: ["principal"],
  });

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[principal-reports-guard] verdict=${verdict} locale=${locale} tenant=${tenant}`,
    );
  }

  if (verdict === "forbidden-role" && role) {
    redirect(`/${locale}${tenantUrl(tenant, DEFAULT_ROUTE[role])}`);
  }
  if (verdict !== "allowed") {
    redirect(`/${locale}/select-tenant`);
  }

  return <>{children}</>;
}
