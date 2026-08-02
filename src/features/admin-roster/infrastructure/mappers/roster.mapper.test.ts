import { describe, expect, it } from "vitest";
import {
  toClassSummary,
  toRosterStudent,
  toSearchStudent,
} from "./roster.mapper";

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

  it("toRosterStudent maps known gender + status", () => {
    const result = toRosterStudent({
      id: "HS25001",
      name: "Nguyễn Minh Anh",
      dob: "15/03/2010",
      gender: "F",
      status: "active",
    });
    expect(result).toEqual({
      id: "HS25001",
      name: "Nguyễn Minh Anh",
      dob: "15/03/2010",
      gender: "F",
      status: "active",
    });
  });

  it("toRosterStudent guards unexpected gender to M", () => {
    const result = toRosterStudent({
      id: "x",
      name: "x",
      dob: "01/01/2010",
      gender: "X",
      status: "active",
    });
    expect(result.gender).toBe("M");
  });

  it("toRosterStudent guards unexpected status to active", () => {
    const result = toRosterStudent({
      id: "x",
      name: "x",
      dob: "01/01/2010",
      gender: "F",
      status: "weird",
    });
    expect(result.status).toBe("active");
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
