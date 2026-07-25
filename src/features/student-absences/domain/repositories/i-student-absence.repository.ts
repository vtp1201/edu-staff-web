import type {
  EditStudentAbsenceInput,
  RecordStudentAbsenceInput,
  StudentAbsenceEntity,
  StudentAbsenceKey,
} from "../entities/student-absence.entity";

/** INT-002 query params (`?classId=&from=&to=`). */
export interface ListStudentAbsencesParams {
  /**
   * Server-forced to the caller's own homeroom for a `teacher`; an OPTIONAL
   * filter for a `principal` (`undefined` = schoolwide).
   */
  classId?: string;
  /** Bare `YYYY-MM-DD`, inclusive. */
  from?: string;
  /** Bare `YYYY-MM-DD`, inclusive. */
  to?: string;
}

/**
 * Student-absence repository contract (US-E09.6) — EXACTLY 4 methods.
 *
 * **There is no `unflag`-shaped method** (FR-006/FR-013): `FLAGGED_UNEXCUSED` is
 * terminal and no reverse transition exists in the BE domain. The absence of the
 * capability is ARCHITECTURAL, not permission-gated — do not add one.
 *
 * Convention: `Promise<T>`-returning; implementations THROW a
 * `StudentAbsenceFailure` (epic-internal consistency with
 * `IDisciplineRepository`/`IStaffDisciplineRepository` — not a `Result` wrapper).
 *
 * The `StudentAbsenceAuthContext` is CONSTRUCTOR-injected into the
 * implementation (not passed per call), so no caller — client or server — can
 * forge the acting role/homeroom. The forgeable surface the security tests
 * exercise is the `classId`/`date` arguments below, which the implementation
 * re-checks against its injected context BEFORE touching state (spec.md
 * §"High-Risk-Grade Security Enforcement" pts. 1–2, 5).
 */
export interface IStudentAbsenceRepository {
  /** INT-002. `teacher` callers are pinned to their own class server-side. */
  listAbsences(
    params: ListStudentAbsencesParams,
  ): Promise<StudentAbsenceEntity[]>;

  /** INT-001 — creates with `state="RECORDED"`. Teacher/own-class only. */
  recordAbsence(
    input: RecordStudentAbsenceInput,
  ): Promise<StudentAbsenceEntity>;

  /** INT-003 — PATCH `reason`/`excused` only. Teacher/own-class only. */
  editAbsence(input: EditStudentAbsenceInput): Promise<StudentAbsenceEntity>;

  /** INT-004 — one-way `RECORDED` → `FLAGGED_UNEXCUSED`. Principal only. */
  flagAbsence(key: StudentAbsenceKey): Promise<StudentAbsenceEntity>;
}
