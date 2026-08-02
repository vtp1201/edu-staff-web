/**
 * Unit tests — ClassManagementMapper (US-E18.4, rewired US-E18.30). Real wire
 * shape uses `classId`/`academicYearLabel`; since BE US-173 the wire ALSO
 * carries `studentCount`/`homeroomTeacherId`/`homeroomTeacherName` directly,
 * so the mapper reads them off the DTO (no injected enrichment object).
 * Request builders rename `academicYear`→`academicYearLabel` and produce the
 * homeroom-assignment display fallback (raw member id).
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
    studentCount: 0,
    homeroomTeacherId: null,
    homeroomTeacherName: null,
    ...over,
  };
}

describe("ClassManagementMapper.toClass", () => {
  it("maps classId/academicYearLabel renames and reads the enriched fields off the DTO", () => {
    const result = ClassManagementMapper.toClass(
      classDto({
        studentCount: 32,
        homeroomTeacherId: "u-teacher-1",
        homeroomTeacherName: "Nguyễn Thị Lan",
      }),
    );
    expect(result).toEqual({
      id: "cls-10a1",
      name: "10A1",
      gradeLevel: 10,
      status: "ACTIVE",
      academicYear: "2025-2026",
      studentCount: 32,
      homeroomTeacherId: "u-teacher-1",
      homeroomTeacherName: "Nguyễn Thị Lan",
    });
  });

  it("keeps the class ASSIGNED when the name lookup degraded (id set, name null)", () => {
    // BE contract (core openapi `ClassResponse`, ADR 0124): a null
    // `homeroomTeacherName` with a non-null `homeroomTeacherId` means the
    // cross-service name resolution failed — NOT "no homeroom teacher". The
    // id stays authoritative and the display falls back to the raw member id
    // (same precedent as `toTeacherMemberFromHomeroom`), so presentation's
    // `homeroomTeacherName ?? "chưa phân công"` never lies.
    const result = ClassManagementMapper.toClass(
      classDto({
        homeroomTeacherId: "u-teacher-1",
        homeroomTeacherName: null,
      }),
    );
    expect(result.homeroomTeacherId).toBe("u-teacher-1");
    expect(result.homeroomTeacherName).toBe("u-teacher-1");
  });

  it("reports no homeroom teacher only when the id itself is null", () => {
    const result = ClassManagementMapper.toClass(
      classDto({ homeroomTeacherId: null, homeroomTeacherName: null }),
    );
    expect(result.homeroomTeacherId).toBeNull();
    expect(result.homeroomTeacherName).toBeNull();
  });

  it("passes through ARCHIVED status", () => {
    const result = ClassManagementMapper.toClass(
      classDto({ status: "ARCHIVED" }),
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
