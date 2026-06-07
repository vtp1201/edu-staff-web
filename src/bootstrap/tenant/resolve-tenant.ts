import { LOCALES } from "@/bootstrap/i18n/locales";

/**
 * Tenant resolution (decision `0007`, US-E05.1). URL shape B —
 * `/{locale}/t/{tenantId}/...` — keeps locale outermost (next-intl matcher
 * untouched) and marks the tenant with a `/t/` prefix so it never collides with
 * a reserved route.
 *
 * INTERIM — TENANT ID IN URL (migrate to slug later): BE IAM identifies a
 * tenant by UUID only (no `slug` field on `MembershipSummary`/`TenantResponse`,
 * iam openapi). So the path segment carries the tenant UUID for now. When BE
 * adds a slug, change `resolveFromPath` to look up slug→id (and update
 * `tenantUrl`) — the rest of the guard already keys on `tenantId`.
 *
 * Phase 1 is path-first only: the `host` branch always returns `null` (reserved
 * for a hybrid subdomain phase 2).
 */
export interface ResolvedTenant {
  /** The tenant the URL points at (currently the UUID segment; slug later). */
  tenantId: string;
  mode: "path" | "host";
}

/** Segment marking a tenant in the path (shape B): `/{locale}/t/{tenantId}`. */
export const TENANT_SEGMENT = "t";

const LOCALE_SET = new Set<string>(LOCALES);

export function resolveTenant(input: {
  pathname: string;
  host?: string;
}): ResolvedTenant | null {
  // 1. host — reserved for phase 2 (hybrid subdomain); always null for now.
  // 2. path — `/{locale}/t/{tenantId}/...`
  const fromPath = resolveFromPath(input.pathname);
  if (fromPath) return fromPath;

  // 3. fallback — middleware decides redirect / 404.
  return null;
}

function resolveFromPath(pathname: string): ResolvedTenant | null {
  const segments = pathname.split("/").filter(Boolean);
  // [locale, "t", tenantId, ...rest]
  if (segments.length < 3) return null;
  const [locale, marker, tenantId] = segments;
  if (!LOCALE_SET.has(locale)) return null;
  if (marker !== TENANT_SEGMENT) return null;
  if (!tenantId) return null;
  return { tenantId, mode: "path" };
}
