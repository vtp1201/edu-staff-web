import { LOCALES } from "@/bootstrap/i18n/locales";

/**
 * Tenant resolution (decision `0007`, US-E05.1). URL shape B —
 * `/{locale}/t/{slug}/...` — keeps locale outermost (next-intl matcher
 * untouched) and marks the tenant with a `/t/` prefix so it never collides with
 * a reserved route.
 *
 * Phase 1 is path-first only: the `host` branch always returns `null` (reserved
 * for a hybrid subdomain phase 2). The `slug → tenantId` map and membership
 * source live in BE IAM and are not available yet, so `tenantId` stays `null`
 * here — the enforcing guard is deferred until BE exposes memberships.
 */
export interface ResolvedTenant {
  slug: string;
  mode: "path" | "host";
  /** Resolved BE tenant id — `null` until IAM exposes a slug→id map. */
  tenantId: string | null;
}

/** Segment marking a tenant in the path (shape B): `/{locale}/t/{slug}`. */
export const TENANT_SEGMENT = "t";

const LOCALE_SET = new Set<string>(LOCALES);

export function resolveTenant(input: {
  pathname: string;
  host?: string;
}): ResolvedTenant | null {
  // 1. host — reserved for phase 2 (hybrid subdomain); always null for now.
  // 2. path — `/{locale}/t/{slug}/...`
  const fromPath = resolveFromPath(input.pathname);
  if (fromPath) return fromPath;

  // 3. fallback — middleware decides redirect / 404.
  return null;
}

function resolveFromPath(pathname: string): ResolvedTenant | null {
  const segments = pathname.split("/").filter(Boolean);
  // [locale, "t", slug, ...rest]
  if (segments.length < 3) return null;
  const [locale, marker, slug] = segments;
  if (!LOCALE_SET.has(locale)) return null;
  if (marker !== TENANT_SEGMENT) return null;
  if (!slug) return null;
  return { slug, mode: "path", tenantId: null };
}
