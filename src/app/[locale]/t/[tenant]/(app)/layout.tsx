import "server-only";
import { redirect } from "next/navigation";
import { evaluateAccess } from "@/bootstrap/auth-guard";
import { makeGetProfileUseCase } from "@/bootstrap/di/auth.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { decodeRoleClaim, decodeTenantId } from "@/bootstrap/lib/jwt";
import ReactQueryProvider from "@/bootstrap/lib/react-query-provider";
import { AppShell } from "@/components/layout/app-shell";
import { requestEmailVerificationAction } from "./email-verification.actions";

/**
 * Tenant app-shell layout — enforces auth + tenant membership (decision 0022/0024).
 * Reads the httpOnly auth_token → derives role + tenantId → redirects if not allowed.
 * Mock-first (ADR 0014/0024): when NEXT_PUBLIC_USE_MOCK=true, passes urlTenantId
 * as tokenTenantId so the tenant-mismatch branch is skipped (mock tokens have no real tenantId).
 */
export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; tenant: string }>;
}) {
  const { locale, tenant } = await params;
  const token = await getAccessToken();
  const role = decodeRoleClaim(token ?? "");

  // Mock-first: mock tokens carry no real tenantId; pass urlTenantId to skip the mismatch check.
  const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
  const tokenTenantId = USE_MOCK ? tenant : decodeTenantId(token ?? "");

  const verdict = evaluateAccess({ role, tokenTenantId, urlTenantId: tenant });

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[app-guard] verdict=${verdict} locale=${locale} tenant=${tenant}`,
    );
  }

  if (verdict !== "allowed") {
    redirect(`/${locale}/select-tenant`);
  }

  // First real GET /users/me for the shell (US-E22.1, closes the mock-first gap).
  // Tri-state: null on fetch error → banner fail-closed (AC-001.3), never a
  // wrong "verified" state. Server-side fetch — no client waterfall (NFR-006).
  const profile = await makeGetProfileUseCase().then((uc) => uc.execute());
  const emailVerified = profile.data ? profile.data.emailVerified : null;
  const email = profile.data?.email ?? "";
  const userName = profile.data?.name ?? "Nguyen Van A";

  return (
    <AppShell
      tenantId={tenant}
      // biome-ignore lint/style/noNonNullAssertion: verdict "allowed" guarantees a non-null role
      role={role!}
      userName={userName}
      emailVerified={emailVerified}
      email={email}
      onRequestEmailVerification={requestEmailVerificationAction}
    >
      <ReactQueryProvider>{children}</ReactQueryProvider>
    </AppShell>
  );
}
