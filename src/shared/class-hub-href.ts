import type { ClassHubTab } from "@/features/teacher/domain/class-hub-tabs";

/**
 * Class-hub deep-link builders (US-E24.8). Pure string helpers shared by the
 * teacher dashboard rows, the weekly-schedule cells, the hub's own tab strip and
 * the legacy `/students` redirect — one spelling of the `?tab=` contract, so a
 * renamed tab id can never leave a stale link behind.
 */

/** Locale + tenant scoped class-list route (also the breadcrumb target). */
export function classHubBase(locale: string, tenant: string): string {
  return `/${locale}/t/${tenant}/teacher/classes`;
}

/** `<base>/<classId>?tab=<tab>` — `base` comes from {@link classHubBase}. */
export function classHubHref(
  base: string,
  classId: string,
  tab: ClassHubTab,
): string {
  return `${base}/${encodeURIComponent(classId)}?tab=${tab}`;
}
