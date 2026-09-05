import { type ClassHubTab, visibleTabs } from "./class-hub-tabs";
import type { ClassRole } from "./entities/teacher-class.entity";

/**
 * Default tab per role (US-E24.8 AC): a subject teacher lands on their roster,
 * a pure homeroom teacher on the homeroom section — a GVCN with no subject
 * assignment here has nothing to grade, so the roster is not their entry point.
 */
function defaultTab(roles: ClassRole[]): ClassHubTab {
  return roles.includes("subject") || !roles.includes("homeroom")
    ? "students"
    : "homeroom";
}

/**
 * Resolves `?tab=` against the viewer's roles. Anything unknown, empty,
 * repeated (`string[]`) or role-forbidden collapses to the role default — a bad
 * deep-link degrades to a working screen, never a 404 or an empty shell.
 */
export function resolveClassHubTab(
  roles: ClassRole[],
  requested: string | string[] | undefined,
): ClassHubTab {
  const allowed = visibleTabs(roles);
  return typeof requested === "string" &&
    (allowed as string[]).includes(requested)
    ? (requested as ClassHubTab)
    : defaultTab(roles);
}
