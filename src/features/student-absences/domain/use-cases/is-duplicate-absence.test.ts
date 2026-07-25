import { describe, expect, it } from "vitest";
import type { StudentAbsenceEntity } from "../entities/student-absence.entity";
import { isDuplicateAbsence } from "./is-duplicate-absence";

function absence(
  over: Partial<StudentAbsenceEntity> = {},
): StudentAbsenceEntity {
  return {
    classId: "11B2",
    studentMemberId: "stu-1",
    date: "2026-05-05",
    excused: true,
    state: "RECORDED",
    recordedByMemberId: "teacher-1",
    createdAt: "2026-05-05T07:40:00Z",
    updatedAt: "2026-05-05T07:40:00Z",
    ...over,
  };
}

/**
 * FR-003 / AC-003.5 — the client-side duplicate pre-check over the ALREADY-LOADED
 * list. All three natural-key parts must match; the server stays authoritative
 * (AC-003.6), which this predicate does not attempt to replace.
 */
describe("isDuplicateAbsence", () => {
  const existing = [
    absence(),
    absence({ studentMemberId: "stu-4", excused: false }),
    absence({
      date: "2026-05-04",
      studentMemberId: "stu-6",
      state: "FLAGGED_UNEXCUSED",
    }),
  ];

  it("detects an exact natural-key match (classId + studentMemberId + date)", () => {
    expect(
      isDuplicateAbsence(
        { classId: "11B2", studentMemberId: "stu-1", date: "2026-05-05" },
        existing,
      ),
    ).toBe(true);
  });

  it("matches regardless of the existing record's state or excused flag", () => {
    expect(
      isDuplicateAbsence(
        { classId: "11B2", studentMemberId: "stu-6", date: "2026-05-04" },
        existing,
      ),
    ).toBe(true);
  });

  it("is false when only the date differs", () => {
    expect(
      isDuplicateAbsence(
        { classId: "11B2", studentMemberId: "stu-1", date: "2026-05-06" },
        existing,
      ),
    ).toBe(false);
  });

  it("is false when only the student differs", () => {
    expect(
      isDuplicateAbsence(
        { classId: "11B2", studentMemberId: "stu-9", date: "2026-05-05" },
        existing,
      ),
    ).toBe(false);
  });

  it("is false when only the class differs (same student + date, other class)", () => {
    expect(
      isDuplicateAbsence(
        { classId: "10A1", studentMemberId: "stu-1", date: "2026-05-05" },
        existing,
      ),
    ).toBe(false);
  });

  it("is false against an empty list", () => {
    expect(
      isDuplicateAbsence(
        { classId: "11B2", studentMemberId: "stu-1", date: "2026-05-05" },
        [],
      ),
    ).toBe(false);
  });
});
