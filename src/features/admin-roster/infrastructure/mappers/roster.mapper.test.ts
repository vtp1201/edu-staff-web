import { describe, expect, it } from "vitest";
import {
  toClassSummary,
  toRosterStudentFromEnrollment,
  toSearchStudent,
} from "./roster.mapper";

/** Wire `EnrollmentResponse` row (`GET /classes/{classId}/students`). */
function enrollmentDto(over: Record<string, unknown> = {}) {
  return {
    enrollmentId: "enr-1",
    classId: "cls-10a1",
    studentMemberId: "stu-uuid-1",
    academicYearLabel: "2025–2026",
    enrolledAt: "2025-09-05T02:00:00Z",
    ...over,
  };
}

/** Wire `ClassResponse` row (enriched since BE US-173, US-E18.30). */
function classDto(over: Record<string, unknown> = {}) {
  return {
    classId: "cls-10a1",
    name: "10A1",
    gradeLevel: 10,
    academicYearLabel: "2025–2026",
    homeroomTeacherId: null,
    homeroomTeacherName: null,
    ...over,
  };
}

describe("roster.mapper", () => {
  it("toClassSummary maps wire classId/academicYearLabel + the enriched homeroom name", () => {
    // US-E18.30: the wire now carries homeroomTeacherId/homeroomTeacherName
    // (BE US-173) — nothing is injected any more.
    const result = toClassSummary(
      classDto({
        homeroomTeacherId: "u-teacher-1",
        homeroomTeacherName: "Nguyễn Thị Hương",
      }),
    );
    expect(result).toEqual({
      id: "cls-10a1",
      name: "10A1",
      gradeLevel: 10,
      homeroomTeacher: "Nguyễn Thị Hương",
      year: "2025–2026",
    });
  });

  it("toClassSummary falls back to the raw member id when only the NAME lookup degraded", () => {
    // id-authoritative rule (ADR 0124, same as class-management.mapper): a null
    // name next to a non-null id means the cross-service name resolution
    // failed — NOT "no homeroom teacher".
    const result = toClassSummary(
      classDto({
        homeroomTeacherId: "u-teacher-1",
        homeroomTeacherName: null,
      }),
    );
    expect(result.homeroomTeacher).toBe("u-teacher-1");
  });

  it("toClassSummary reports no homeroom only when the id itself is null", () => {
    const result = toClassSummary(
      classDto({
        classId: "cls-10b3",
        homeroomTeacherId: null,
        homeroomTeacherName: null,
      }),
    );
    expect(result.homeroomTeacher).toBeNull();
  });

  it("toRosterStudentFromEnrollment joins the enrollment row with the IAM detail", () => {
    const result = toRosterStudentFromEnrollment(enrollmentDto(), {
      name: "Nguyễn Minh Anh",
      dob: "2010-03-15T00:00:00Z",
      gender: "FEMALE",
    });

    expect(result).toEqual({
      // The MEMBER id — the key every roster mutation uses. NOT enrollmentId.
      id: "stu-uuid-1",
      name: "Nguyễn Minh Anh",
      dob: "15/03/2010",
      gender: "F",
      status: "active",
    });
  });

  it("toRosterStudentFromEnrollment maps the three IAM gender values", () => {
    const g = (gender: "MALE" | "FEMALE" | "OTHER") =>
      toRosterStudentFromEnrollment(enrollmentDto(), { gender }).gender;

    expect(g("MALE")).toBe("M");
    expect(g("FEMALE")).toBe("F");
    // "Khác" is a real self-reported value — it must not be coerced to M/F.
    expect(g("OTHER")).toBe("O");
  });

  it("toRosterStudentFromEnrollment leaves name/dob/gender ABSENT when IAM has no detail for the member", () => {
    // Lookup miss (unresolvable id) or a degraded batch call. The keys must be
    // absent, not `undefined`-valued — presentation owns the placeholder copy,
    // and `toEqual` alone would not catch a materialised `dob: undefined`.
    const result = toRosterStudentFromEnrollment(enrollmentDto());

    expect(Object.keys(result).sort()).toEqual(["id", "status"]);
    expect(result).toEqual({ id: "stu-uuid-1", status: "active" });
  });

  it("toRosterStudentFromEnrollment leaves dob/gender ABSENT when the member simply never set them (ADR-0122)", () => {
    const result = toRosterStudentFromEnrollment(enrollmentDto(), {
      name: "Trần Văn Bình",
    });

    expect(Object.keys(result).sort()).toEqual(["id", "name", "status"]);
  });

  it("toRosterStudentFromEnrollment never invents a student code — no wire source exists", () => {
    // `code` (mã học sinh) exists in no core/IAM contract. Absent > a uuid
    // rendered under a "Mã học sinh" header, which would be a lie.
    expect("code" in toRosterStudentFromEnrollment(enrollmentDto())).toBe(
      false,
    );
  });

  it('toRosterStudentFromEnrollment sets status "active" for EVERY row — the endpoint returns only current enrollments', () => {
    // `EnrollmentResponse` carries no status field, and none is inferable:
    // unenroll/transfer HARD-DELETE the enrollment row (core
    // `RemoveStudentFromClassUseCase`, ADR 0049), so a transferred student
    // simply stops appearing here. "active" is the semantics of the list, not
    // an invented value.
    expect(toRosterStudentFromEnrollment(enrollmentDto()).status).toBe(
      "active",
    );
  });

  it("toRosterStudentFromEnrollment formats dob without timezone drift", () => {
    // A date-only value arriving as UTC midnight must not shift a day when the
    // runner sits in UTC+7 — so the string is sliced, never Date-parsed.
    const result = toRosterStudentFromEnrollment(enrollmentDto(), {
      dob: "2010-01-01T00:00:00Z",
    });
    expect(result.dob).toBe("01/01/2010");
  });

  it("toRosterStudentFromEnrollment drops an unparseable dob rather than rendering garbage", () => {
    const result = toRosterStudentFromEnrollment(enrollmentDto(), {
      dob: "not-a-date",
    });
    expect("dob" in result).toBe(false);
  });

  it("toSearchStudent passes nullable class fields through", () => {
    expect(
      toSearchStudent({
        id: "HS25202",
        name: "Trần Thuỵ Vân",
        currentClassId: "cls-10a2",
        currentClassName: "10A2",
      }),
    ).toEqual({
      id: "HS25202",
      name: "Trần Thuỵ Vân",
      currentClassId: "cls-10a2",
      currentClassName: "10A2",
    });
    expect(
      toSearchStudent({
        id: "HS25201",
        name: "x",
        currentClassId: null,
        currentClassName: null,
      }).currentClassId,
    ).toBeNull();
  });
});
