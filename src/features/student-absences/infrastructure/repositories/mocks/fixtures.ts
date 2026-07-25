import type { StudentAbsenceKey } from "../../../domain/entities/student-absence.entity";
import type { StudentRosterEntry } from "../../../domain/entities/student-roster-entry.entity";
import type { StudentAbsenceResponseDto } from "../../dtos/student-absence-response.dto";

/**
 * Deterministic mock fixtures (US-E09.6, spec.md §6 "Mock fixtures required").
 * Adapted from `design_src/edu/student-absences.jsx` (`SA_STUDENT_ROSTER`,
 * `SA_CURRENT_TEACHER`, `SA_SEED_ABSENCES`, `SA_TODAY`, `SA_CLASSES`).
 *
 * Student names / class labels are mock DATA, not i18n copy (`.claude/rules/i18n.md`).
 *
 * Anti-demo rule: nothing here is random or time-dependent. Every
 * security-relevant row is reachable through a NAMED key const, so the
 * forbidden-class / non-principal-flag / re-flag assertions are reproducible.
 */

/** Fixed mock "today" — the future-date guard is deterministic against this. */
export const SA_TODAY = "2026-05-06";

/** The signed-in GVCN persona and their OWN homeroom class. */
export const SA_TEACHER_MEMBER_ID = "teacher-1";
export const SA_TEACHER_CLASS_ID = "11B2";
/** A second GVCN's class — the "someone else's homeroom" forgery target. */
export const SA_FORBIDDEN_CLASS_ID = "10A1";
/** The signed-in BGH/`principal` persona (the flagging actor). */
export const SA_PRINCIPAL_MEMBER_ID = "admin-1";

/**
 * Class picklist for the principal's class filter. In the mock the class id IS
 * the class label (mirrors the reference mockup) — DATA, not i18n copy.
 */
export const SA_CLASSES: readonly string[] = [
  "10A1",
  "10A2",
  "11B2",
  "12C1",
] as const;

/**
 * Fixed student roster (FR-010 — NOT live search). `className` doubles as the
 * class-scope key while the feature is mock-first (see `StudentRosterEntry`).
 */
export const SA_STUDENT_ROSTER: readonly StudentRosterEntry[] = [
  { studentMemberId: "stu-1", fullName: "Trần Văn Bình", className: "11B2" },
  { studentMemberId: "stu-2", fullName: "Phạm Đức Dũng", className: "10A1" },
  { studentMemberId: "stu-3", fullName: "Bùi Minh Tuấn", className: "10A1" },
  { studentMemberId: "stu-4", fullName: "Lê Thị Cẩm", className: "11B2" },
  { studentMemberId: "stu-5", fullName: "Hoàng Văn Nam", className: "12C1" },
  { studentMemberId: "stu-6", fullName: "Nguyễn Minh Anh", className: "11B2" },
] as const;

/** The roster slice a GVCN may record for — their own homeroom only. */
export function saRosterForClass(
  classId: string,
): readonly StudentRosterEntry[] {
  return SA_STUDENT_ROSTER.filter((s) => s.className === classId);
}

// --- Named security/state fixtures ------------------------------------------

/** `RECORDED` + `excused: true`, in the GVCN's own class (edit + flag target). */
export const MOCK_RECORDED_EXCUSED_KEY: StudentAbsenceKey = {
  classId: SA_TEACHER_CLASS_ID,
  studentMemberId: "stu-1",
  date: "2026-05-05",
};

/** `RECORDED` + `excused: false`, own class. */
export const MOCK_RECORDED_UNEXCUSED_KEY: StudentAbsenceKey = {
  classId: SA_TEACHER_CLASS_ID,
  studentMemberId: "stu-4",
  date: "2026-05-05",
};

/** Already `FLAGGED_UNEXCUSED` — the re-flag (`invalid-state`) backstop target. */
export const MOCK_FLAGGED_KEY: StudentAbsenceKey = {
  classId: SA_TEACHER_CLASS_ID,
  studentMemberId: "stu-6",
  date: "2026-05-04",
};

/**
 * `excused: true` AND `FLAGGED_UNEXCUSED` at the same time — proves the two
 * signals are orthogonal, never conflated (FR-007/AC-007.4).
 */
export const MOCK_EXCUSED_AND_FLAGGED_KEY: StudentAbsenceKey = {
  classId: SA_TEACHER_CLASS_ID,
  studentMemberId: "stu-1",
  date: "2026-05-02",
};

/** A row in ANOTHER homeroom — the forged-classId target for record/edit. */
export const MOCK_OTHER_CLASS_KEY: StudentAbsenceKey = {
  classId: SA_FORBIDDEN_CLASS_ID,
  studentMemberId: "stu-2",
  date: "2026-05-04",
};

/** A date with no record in the GVCN's class — safe to record onto. */
export const MOCK_FREE_DATE = "2026-05-06";

/**
 * Seed rows (fresh array per call so each repository instance owns its state).
 * Coverage: RECORDED+excused, RECORDED+unexcused, FLAGGED_UNEXCUSED+unexcused,
 * FLAGGED_UNEXCUSED+excused, plus two other classes for the principal's
 * schoolwide/class-filter view.
 */
export function seedStudentAbsences(): StudentAbsenceResponseDto[] {
  return [
    {
      ...MOCK_RECORDED_EXCUSED_KEY,
      reason: "Sốt cao, có giấy khám của trạm y tế phường.",
      excused: true,
      state: "RECORDED",
      recordedByMemberId: SA_TEACHER_MEMBER_ID,
      createdAt: "2026-05-05T07:40:00Z",
      updatedAt: "2026-05-05T07:40:00Z",
    },
    {
      ...MOCK_RECORDED_UNEXCUSED_KEY,
      excused: false,
      state: "RECORDED",
      recordedByMemberId: SA_TEACHER_MEMBER_ID,
      createdAt: "2026-05-05T07:45:00Z",
      updatedAt: "2026-05-05T07:45:00Z",
    },
    {
      ...MOCK_FLAGGED_KEY,
      reason: "Không rõ lý do, gia đình không liên lạc được.",
      excused: false,
      state: "FLAGGED_UNEXCUSED",
      recordedByMemberId: SA_TEACHER_MEMBER_ID,
      flaggedByMemberId: SA_PRINCIPAL_MEMBER_ID,
      createdAt: "2026-05-04T07:35:00Z",
      updatedAt: "2026-05-04T15:00:00Z",
    },
    {
      ...MOCK_EXCUSED_AND_FLAGGED_KEY,
      reason: "Đi khám răng theo lịch hẹn — có giấy xác nhận phòng khám.",
      excused: true,
      state: "FLAGGED_UNEXCUSED",
      recordedByMemberId: SA_TEACHER_MEMBER_ID,
      flaggedByMemberId: SA_PRINCIPAL_MEMBER_ID,
      createdAt: "2026-05-02T07:30:00Z",
      updatedAt: "2026-05-02T09:00:00Z",
    },
    {
      ...MOCK_OTHER_CLASS_KEY,
      excused: false,
      state: "RECORDED",
      recordedByMemberId: "teacher-2",
      createdAt: "2026-05-04T07:20:00Z",
      updatedAt: "2026-05-04T07:20:00Z",
    },
    {
      classId: "12C1",
      studentMemberId: "stu-5",
      date: "2026-04-29",
      excused: false,
      state: "RECORDED",
      recordedByMemberId: "teacher-3",
      createdAt: "2026-04-29T07:15:00Z",
      updatedAt: "2026-04-29T07:15:00Z",
    },
  ];
}
