import type {
  EditStudentAbsenceInput,
  RecordStudentAbsenceInput,
  StudentAbsenceEntity,
  StudentAbsenceKey,
} from "../../domain/entities/student-absence.entity";
import type { StudentRosterEntry } from "../../domain/entities/student-roster-entry.entity";
import type { StudentAbsenceFailure } from "../../domain/failures/student-absence.failure";

export type StudentAbsencesRole = "teacher" | "principal";
export type StudentAbsencesErrorKey = StudentAbsenceFailure["type"];

/** Server Action result — STABLE failure keys only, never translated copy. */
export type StudentAbsencesActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      errorKey: StudentAbsencesErrorKey;
      retryable?: boolean;
    };

export interface StudentAbsencesClassOption {
  classId: string;
  /** Display DATA (class name), not i18n copy. */
  className: string;
}

export type ListAbsencesAction = (params: {
  classId?: string;
  from?: string;
  to?: string;
}) => Promise<StudentAbsencesActionResult<StudentAbsenceEntity[]>>;

interface StudentAbsencesScreenBaseVM {
  /**
   * Bare `YYYY-MM-DD` "today", seeded by the server so the date picker's `max`,
   * the client future-date guard and the server re-check all agree. Presentation
   * never reads a clock itself (NFR-009, deterministic stories).
   */
  today: string;

  initialAbsences: StudentAbsenceEntity[];
  /**
   * Set only when the RSC's own list fetch failed. Error and empty stay
   * DISTINCT — never silently coerced to an empty-list render.
   */
  initialErrorKey?: StudentAbsencesErrorKey;

  /**
   * Static roster used to resolve `studentMemberId` → display name (FR-010 — no
   * live search, never refetched). Scoped by the SERVER: the teacher route passes
   * their own homeroom only (so it doubles as the record form's picklist), the
   * principal route passes the schoolwide roster for row display only.
   *
   * (Deviation from component-architecture.md §4.1, which specified `[]` for the
   * principal: with an empty roster the principal's rows would render raw
   * `studentMemberId` UUIDs instead of names.)
   */
  roster: StudentRosterEntry[];

  listAbsencesAction: ListAbsencesAction;
}

/**
 * Teacher (GVCN) arm — record + edit, own homeroom only.
 *
 * Structurally carries NO `flagAbsenceAction`: the flag capability is not merely
 * hidden for this role, it does not exist on this arm of the contract (FR-005).
 */
export interface TeacherStudentAbsencesVM extends StudentAbsencesScreenBaseVM {
  viewerRole: "teacher";
  /** The teacher's OWN homeroom class — scopes record/edit and the list. */
  classId: string;
  recordAbsenceAction: (
    input: RecordStudentAbsenceInput,
  ) => Promise<StudentAbsencesActionResult<StudentAbsenceEntity>>;
  editAbsenceAction: (
    input: EditStudentAbsenceInput,
  ) => Promise<StudentAbsencesActionResult<StudentAbsenceEntity>>;
}

/**
 * Principal arm — read + flag only.
 *
 * Structurally carries NO `recordAbsenceAction`/`editAbsenceAction`: AC-006.5's
 * "zero record/edit affordance anywhere, not merely disabled" is therefore a
 * COMPILE-time guarantee — the principal route cannot even wire those actions,
 * so no branch of the screen can render a control that calls them.
 */
export interface PrincipalStudentAbsencesVM
  extends StudentAbsencesScreenBaseVM {
  viewerRole: "principal";
  /** Class-filter dropdown — small static list, not paginated. */
  classOptions: StudentAbsencesClassOption[];
  flagAbsenceAction: (
    key: StudentAbsenceKey,
  ) => Promise<StudentAbsencesActionResult<StudentAbsenceEntity>>;
}

/**
 * Screen-level ViewModel — the server↔client contract, a DISCRIMINATED UNION on
 * `viewerRole` (component-architecture.md §4.1, tightened the same way §1 decision 2
 * tightened the form dialog). ONE list/query family, so ONE `initialErrorKey`.
 *
 * There is no `unflagAbsenceAction` on either arm (FR-006/FR-013).
 */
export type StudentAbsencesScreenVM =
  | TeacherStudentAbsencesVM
  | PrincipalStudentAbsencesVM;
