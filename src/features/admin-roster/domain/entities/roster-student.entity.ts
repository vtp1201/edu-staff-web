/**
 * A student enrolled in a class roster.
 *
 * Every display field except `id`/`status` is OPTIONAL since US-E18.35, when
 * the roster went real. The real row is a join of two services:
 * - core `GET /classes/{id}/students` — the AUTHORITY (which students are
 *   enrolled). It carries `studentMemberId` and nothing displayable.
 * - IAM `GET /members?ids=` — DECORATION (name/dob/gender), best-effort.
 *
 * A missing field therefore means one of two honest things — "IAM could not
 * resolve this member" or "this member never filled it in" (dob/gender are
 * optional per user, ADR-0122) — and presentation renders a placeholder for
 * it. Infrastructure never fabricates a value and never bakes in copy.
 */
export interface RosterStudent {
  /**
   * The student's `memberId`. This is the key every mutation
   * (enroll/unenroll/transfer) uses — NOT the enrollment id.
   * A uuid in real mode; the human code in mock mode.
   */
  id: string;
  /**
   * Human student code ("HS25001"). ABSENT in real mode: no core or IAM
   * contract exposes a student code, and printing the member uuid under a
   * "Mã học sinh" header would be a lie, not a fallback.
   */
  code?: string;
  /** Display name. ABSENT when the IAM batch lookup could not resolve the id. */
  name?: string;
  /** Date of birth, display string dd/MM/yyyy. ABSENT when unset (ADR-0122). */
  dob?: string;
  /** F = nữ, M = nam, O = khác. ABSENT when unset (ADR-0122). */
  gender?: "F" | "M" | "O";
  /**
   * `transferred` is reachable in MOCK mode only. The real endpoint returns
   * exclusively current enrollments — unenroll/transfer hard-delete the
   * enrollment row (core `RemoveStudentFromClassUseCase`, ADR 0049) — so every
   * real row is `active` by definition of the list, not by an invented field.
   */
  status: "active" | "transferred";
}
