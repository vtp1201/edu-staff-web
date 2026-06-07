import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./bootstrap/i18n/routing";
import { resolveTenant } from "./bootstrap/tenant";

const intlMiddleware = createMiddleware(routing);

/**
 * Compose: next-intl locale routing first (untouched), then resolve the tenant
 * from the path (shape B `/{locale}/t/{slug}`, decision `0007`, US-E05.1) and
 * tag the response with `x-tenant-slug` + trace it with the request id.
 *
 * Phase 1 RESOLVES + observes only; it does NOT enforce membership. The
 * authorization hard gate (slug→tenantId map + `AuthUser.roles` check) is a BE
 * dependency (IAM has no membership endpoint yet) and is deferred — see the
 * tenant decision.
 */
export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  const tenant = resolveTenant({ pathname: request.nextUrl.pathname });

  if (tenant) {
    response.headers.set("x-tenant-slug", tenant.slug);
    if (process.env.NODE_ENV !== "production") {
      const requestId = request.headers.get("x-request-id") ?? "-";
      console.info(
        `[tenant] slug=${tenant.slug} mode=${tenant.mode} requestId=${requestId}`,
      );
    }
  }

  return response;
}

export const config = {
  matcher: ["/", "/(vi|en)/:path*"],
};
