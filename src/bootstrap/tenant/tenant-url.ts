import { TENANT_SEGMENT } from "./resolve-tenant";

/**
 * Build a tenant-scoped, locale-relative path (shape B). The locale prefix is
 * added by the next-intl `Link`/router, so this returns `/t/{slug}{path}`.
 * All internal workspace links must go through this helper so the eventual
 * hybrid (subdomain) phase can change URL generation in one place.
 */
export function tenantUrl(slug: string, path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const suffix = normalized === "/" ? "" : normalized;
  return `/${TENANT_SEGMENT}/${slug}${suffix}`;
}
