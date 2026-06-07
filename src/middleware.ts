import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./bootstrap/i18n/routing";
import { AUTH_COOKIE } from "./bootstrap/lib/auth-token.server";
import { decodeTenantId } from "./bootstrap/lib/jwt";
import { evaluateTenantAccess, resolveTenant } from "./bootstrap/tenant";

const intlMiddleware = createMiddleware(routing);

/**
 * Compose: next-intl locale routing first (untouched), then resolve + ENFORCE
 * the tenant from the path (shape B `/{locale}/t/{tenantId}`, decision `0007`,
 * US-E05.1).
 *
 * Enforcement is cheap and round-trip-free: the BE mints a tenant-scoped token
 * on `/members/switch-tenant` (rejecting non-members with 403), so the URL's
 * tenant must equal the access token's `tenantId` claim. A mismatch / missing
 * scope redirects to tenant selection. BE still enforces membership on every API
 * call (defense in depth).
 *
 * INTERIM: the path segment is the tenant UUID (BE has no slug yet) — see
 * `resolve-tenant.ts`. Route-move of the role dashboards under `/t/{tenantId}`
 * and the in-shell switcher wiring are the remaining follow-ups.
 */
export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  const { pathname } = request.nextUrl;
  const tenant = resolveTenant({ pathname });
  if (!tenant) return response;

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const verdict = evaluateTenantAccess(
    tenant.tenantId,
    token ? decodeTenantId(token) : null,
  );

  if (process.env.NODE_ENV !== "production") {
    const requestId = request.headers.get("x-request-id") ?? "-";
    console.info(
      `[tenant] id=${tenant.tenantId} verdict=${verdict} requestId=${requestId}`,
    );
  }

  if (verdict !== "allowed") {
    const locale =
      pathname.split("/").filter(Boolean)[0] ?? routing.defaultLocale;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/select-tenant`;
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  response.headers.set("x-tenant-id", tenant.tenantId);
  return response;
}

export const config = {
  matcher: ["/", "/(vi|en)/:path*"],
};
