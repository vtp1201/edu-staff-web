import type { ClassRole } from "./entities/teacher-class.entity";

/**
 * The four sections of the class hub (US-E24.8). The URL param, the i18n key
 * and this union share ONE spelling: `timetable` (the design mockup's internal
 * variable is `sessions`; the story packet fixes the public contract as
 * `timetable`, so `sessions` appears nowhere in code, URLs or messages).
 */
export type ClassHubTab = "students" | "timetable" | "course" | "homeroom";

/** Class-scoped tabs every teacher of the class may open, in design order. */
const SHARED_TABS: readonly ClassHubTab[] = [
  "students",
  "timetable",
  "course",
] as const;

/**
 * Which tabs this teacher may see for this class. The "Chủ nhiệm" tab is
 * homeroom-only (GVCN); the other three apply to any teacher of the class.
 * Single source of truth for tab validity — the resolver and the tablist both
 * read it, so a forbidden `?tab=` can never render a tab the strip omits.
 */
export function visibleTabs(roles: ClassRole[]): ClassHubTab[] {
  return roles.includes("homeroom")
    ? [...SHARED_TABS, "homeroom"]
    : [...SHARED_TABS];
}
