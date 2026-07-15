/**
 * Unit tests — ClassManagementMapper (US-E18.4). Real wire shape uses
 * `classId`/`academicYearLabel`; `studentCount`/homeroom fields are NOT on
 * the wire and must come from the injected enrichment object, never from the
 * DTO directly. Request builders rename `academicYear`→`academicYearLabel`
 * and produce the homeroom-assignment display fallback (raw member id).
 */
import { describe, expect, it } from "vitest";
import type { ClassResponseDto } from "../dtos/class-response.dto";
import type { HomeroomAssignmentResponseDto } from "../dtos/homeroom-assignment-response.dto";
import { ClassManagementMapper } from "./class-management.mapper";

function classDto(over: Partial<ClassResponseDto> = {}): ClassResponseDto {
  return {
    classId: "cls-10a1",
    tenantId: "tenant-1",
    name: "10A1",
    gradeLevel: 10,
    academicYearLabel: "2025-2026",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("ClassManagementMapper.toClass", () => {
  it("maps classId/academicYearLabel renames and injects the enrichment", () => {
    const result = ClassManagementMapper.toClass(classDto(), {
      studentCount: 32,
      homeroomTeacherId: "u-teacher-1",
      homeroomTeacherName: "u-teacher-1",
    });
    expect(result).toEqual({
      id: "cls-10a1",
      name: "10A1",
      gradeLevel: 10,
      status: "ACTIVE",
      academicYear: "2025-2026",
      studentCount: 32,
      homeroomTeacherId: "u-teacher-1",
      homeroomTeacherName: "u-teacher-1",
    });
  });

  it("does not read studentCount/homeroom off the DTO even if present", () => {
    const dtoWithExtra = {
      ...classDto(),
      studentCount: 999,
      homeroomTeacherId: "should-be-ignored",
    } as ClassResponseDto;
    const result = ClassManagementMapper.toClass(dtoWithExtra, {
      studentCount: 0,
      homeroomTeacherId: null,
      homeroomTeacherName: null,
    });
    expect(result.studentCount).toBe(0);
    expect(result.homeroomTeacherId).toBeNull();
  });

  it("passes through ARCHIVED status", () => {
    const result = ClassManagementMapper.toClass(
      classDto({ status: "ARCHIVED" }),
      { studentCount: 0, homeroomTeacherId: null, homeroomTeacherName: null },
    );
    expect(result.status).toBe("ARCHIVED");
  });
});

describe("ClassManagementMapper.toCreateClassBody", () => {
  it("renames academicYear to academicYearLabel", () => {
    const body = ClassManagementMapper.toCreateClassBody({
      name: "10A3",
      gradeLevel: 10,
      academicYear: "2025-2026",
    });
    expect(body).toEqual({
      name: "10A3",
      gradeLevel: 10,
      academicYearLabel: "2025-2026",
    });
  });
});

describe("ClassManagementMapper.toUpdateClassBody", () => {
  it("builds the PATCH body with both required fields", () => {
    const body = ClassManagementMapper.toUpdateClassBody({
      name: "10A1-renamed",
      gradeLevel: 11,
    });
    expect(body).toEqual({ name: "10A1-renamed", gradeLevel: 11 });
  });
});

describe("ClassManagementMapper.toTeacherMemberFromHomeroom", () => {
  it("falls back to the raw teacherMemberId for displayName + empty email", () => {
    const dto: HomeroomAssignmentResponseDto = {
      classId: "cls-10a1",
      teacherMemberId: "member-uuid-123",
      assignedAt: "2026-01-01T00:00:00Z",
      assignedBy: "admin-uuid",
    };
    const result = ClassManagementMapper.toTeacherMemberFromHomeroom(dto);
    expect(result).toEqual({
      userId: "member-uuid-123",
      displayName: "member-uuid-123",
      email: "",
    });
  });
});
