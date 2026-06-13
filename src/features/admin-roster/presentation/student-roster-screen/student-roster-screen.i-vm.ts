import type { ClassSummary } from "@/features/admin-roster/domain/entities/class-summary.entity";
import type { RosterStudent } from "@/features/admin-roster/domain/entities/roster-student.entity";
import type { SearchStudent } from "@/features/admin-roster/domain/entities/search-student.entity";
import type { RosterFailure } from "@/features/admin-roster/domain/failures/roster.failure";

/**
 * ViewModel — server↔client contract.
 * RSC page.tsx maps use-case output into this shape and passes it as props
 * to StudentRosterScreen. No infrastructure types may cross this boundary.
 */
export interface StudentRosterScreenVm {
  /** All classes for the current academic year (drives RosterBreadcrumb). */
  classes: ClassSummary[];
  /** The currently selected class (default = first in classes). */
  currentClass: ClassSummary;
  /** Enrolled students for currentClass. Includes transferred entries. */
  roster: RosterStudent[];
  /** Derived: roster.filter(s => s.status === 'active').length */
  activeCount: number;
  /** Derived: roster.filter(s => s.status === 'transferred').length */
  transferredCount: number;
  /** Candidate pool for AddStudentPanel — students NOT in currentClass. */
  searchPool: SearchStudent[];
}

/** Action result — uniform shape across all Server Actions. */
export interface RosterActionResult {
  ok: boolean;
  /** Matches a key in adminRoster.errors namespace. Present when ok=false. */
  errorKey?: RosterFailure["type"];
}

export interface StudentRosterScreenProps {
  vm: StudentRosterScreenVm;
  /** Enroll a single unassigned student. */
  onEnroll: (studentId: string) => Promise<RosterActionResult>;
  /** Remove a single student from the class. */
  onUnenroll: (studentId: string) => Promise<RosterActionResult>;
  /** Bulk remove selected students. */
  onUnenrollMany: (studentIds: string[]) => Promise<RosterActionResult>;
  /** Transfer a student from their current class to currentClass. */
  onTransfer: (
    studentId: string,
    fromClassId: string,
  ) => Promise<RosterActionResult>;
}
