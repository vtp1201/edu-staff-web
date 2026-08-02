import type { StatusTone } from "@/components/shared/status-badge";
import type { TeacherRosterStudent } from "../domain/entities/teacher-roster-student.entity";

/**
 * Roster-student enrolment status → badge tone. Single source for BOTH teacher
 * roster tables — `TeacherRosterTable` (per-class screen) and
 * `TeacherStudentsRosterTable` (cross-class screen) — which previously each
 * carried a byte-identical local `STATUS_TONE` map
 * (component-organization.md, decision 0026; mirrors the
 * `principal/presentation/classes/class-status-tone.ts` precedent).
 *
 * Keyed off the domain entity's own status union so a new enrolment status is a
 * compile error here, not a silently-undefined tone in a table.
 */
export const STUDENT_STATUS_TONE: Record<
  TeacherRosterStudent["status"],
  StatusTone
> = {
  active: "success",
  transferred: "muted",
};
