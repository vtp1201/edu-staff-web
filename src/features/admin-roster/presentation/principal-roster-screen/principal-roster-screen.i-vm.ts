import type { ClassSummary } from "@/features/admin-roster/domain/entities/class-summary.entity";
import type { RosterStudent } from "@/features/admin-roster/domain/entities/roster-student.entity";
import type { RosterFailure } from "@/features/admin-roster/domain/failures/roster.failure";

/**
 * ViewModel — server↔client contract for the READ-ONLY principal roster
 * (US-E13.10). Same roster domain as `StudentRosterScreenVm`, minus
 * `searchPool` (no AddStudentPanel) and with an explicit `fetchError`, because
 * this screen has no Server Action to surface failures through.
 *
 * There are deliberately NO action props: the absence of a mutation contract
 * IS the read-only guarantee at the type level.
 */
export interface PrincipalRosterScreenVm {
  /** All classes for the current academic year (drives RosterBreadcrumb). */
  classes: ClassSummary[];
  /** Selected class; `null` only when the school has no class at all. */
  currentClass: ClassSummary | null;
  /** Enrolled students for currentClass. Includes transferred entries. */
  roster: RosterStudent[];
  /** Derived: roster.filter(s => s.status === 'active').length */
  activeCount: number;
  /** Derived: roster.filter(s => s.status === 'transferred').length */
  transferredCount: number;
  /** Failure key of the class/roster fetch — matches adminRoster.errors.*. */
  fetchError: RosterFailure["type"] | null;
}

export interface PrincipalRosterScreenProps {
  vm: PrincipalRosterScreenVm;
  /**
   * Class-switch override. Defaults to a `?classId=` router push (the same URL
   * contract the admin route uses); Storybook passes a spy instead.
   */
  onClassChange?: (classId: string) => void;
  /**
   * Retry override for the error state. Defaults to `router.refresh()`.
   */
  onRetry?: () => void;
}
