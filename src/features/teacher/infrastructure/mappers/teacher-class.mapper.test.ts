import { describe, expect, it } from "vitest";
import type { ClassRosterItemDto } from "../dtos/class-roster-response.dto";
import { toTeacherRosterStudent } from "./teacher-class.mapper";

const base: ClassRosterItemDto = {
  enrollmentId: "enr-1",
  classId: "cls-1",
  studentMemberId: "stu-1",
  displayName: "Nguyễn Văn An",
  academicYearLabel: "2025–2026",
  enrolledAt: "2025-09-01",
  status: "active",
};

describe("toTeacherRosterStudent", () => {
  it("maps an enrollment DTO to the roster entity", () => {
    expect(toTeacherRosterStudent(base)).toEqual({
      enrollmentId: "enr-1",
      studentMemberId: "stu-1",
      displayName: "Nguyễn Văn An",
      academicYearLabel: "2025–2026",
      enrolledAt: "2025-09-01",
      status: "active",
    });
  });

  it("falls back to studentMemberId when displayName is absent", () => {
    const dto = { ...base, displayName: undefined };
    expect(toTeacherRosterStudent(dto).displayName).toBe("stu-1");
  });

  it("normalizes an unknown status to active", () => {
    const dto = { ...base, status: undefined };
    expect(toTeacherRosterStudent(dto).status).toBe("active");
  });

  it("preserves transferred status", () => {
    const dto = { ...base, status: "transferred" };
    expect(toTeacherRosterStudent(dto).status).toBe("transferred");
  });
});
