/**
 * Client-only student roster entry (FR-010/FR-012) — NEVER on the wire.
 *
 * The `core` absence response carries only `studentMemberId`/`classId` UUIDs and
 * no display fields, and no roster-search endpoint exists (roster-UUID gap,
 * cross-repo asks #9/#15/#22). The teacher's record form therefore selects from
 * a FIXED roster fixture scoped to their own homeroom class — there is no
 * live search-as-you-type call anywhere in this feature.
 */
export interface StudentRosterEntry {
  studentMemberId: string;
  fullName: string;
  /**
   * Display name of the student's class. In the mock fixtures the class id and
   * class name are the same string (e.g. `"11B2"`), matching
   * `design_src/edu/student-absences.jsx` — so this doubles as the roster's
   * class-scope key while the feature is mock-first.
   */
  className: string;
}
