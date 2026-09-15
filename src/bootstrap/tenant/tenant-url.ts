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

/**
 * Href of the per-child academic-record route, under the tenant-scoped
 * `/t/{tenant}/parent/children` prefix the RSC page computes (a client screen
 * has no access to the tenant segment).
 *
 * Lives here, next to `tenantUrl`, rather than in a feature's VM builder:
 * route-href construction is app-routing knowledge shared by the parent
 * children-overview screen and the academic-record container (US-E24.16
 * review) — a feature's presentation module is not a canonical home for it.
 */
export function academicRecordHref(
  basePath: string,
  studentId: string,
): string {
  return `${basePath}/${encodeURIComponent(studentId)}/academic-record`;
}
