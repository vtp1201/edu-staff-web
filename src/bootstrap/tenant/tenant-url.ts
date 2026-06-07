import { TENANT_SEGMENT } from "./resolve-tenant";

/**
 * Build a tenant-scoped, locale-relative path (shape B). The locale prefix is
 * added by the next-intl `Link`/router, so this returns `/t/{tenantId}{path}`.
 * All internal workspace links must go through this helper so the move to a
 * pretty slug (or the hybrid subdomain phase) changes URL generation in one place.
 *
 * INTERIM: `tenantId` is the BE tenant UUID until IAM exposes a slug.
 */
export function tenantUrl(tenantId: string, path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const suffix = normalized === "/" ? "" : normalized;
  return `/${TENANT_SEGMENT}/${tenantId}${suffix}`;
}
