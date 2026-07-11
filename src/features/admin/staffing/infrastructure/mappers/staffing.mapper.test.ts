/**
 * Unit tests — StaffingMapper DTO → entity mapping (US-E18.2 contract remap).
 * Covers: department concept-label split + id rename, position-title id rename +
 * 6-value permission enum, assignment id/createdAt rename, status `ARCHIVED` →
 * `REVOKED`, and the derived extras (count, joined names) threaded in by the repo.
 */
import { describe, expect, it } from "vitest";
import type { DepartmentResponseDto } from "../dtos/department-response.dto";
import type { PositionAssignmentResponseDto } from "../dtos/position-assignment-response.dto";
import type { PositionTitleResponseDto } from "../dtos/position-title-response.dto";
import { StaffingMapper } from "./staffing.mapper";

describe("StaffingMapper.toDepartment", () => {
  const dto: DepartmentResponseDto = {
    departmentId: "dep-1",
    tenantId: "t-1",
    name: "Tổ Toán",
    conceptLabelSuggested: "TO",
    conceptLabelCustom: "Tổ chuyên môn",
    subjectParentIds: ["sp-math"],
    status: "ACTIVE",
    createdAt: "2025-08-01T00:00:00.000Z",
    updatedAt: "2025-08-01T00:00:00.000Z",
  };

  it("maps departmentId → id and keeps both concept-label fields", () => {
    const dep = StaffingMapper.toDepartment(dto, 3);
    expect(dep.id).toBe("dep-1");
    expect(dep.conceptLabelSuggested).toBe("TO");
    expect(dep.conceptLabelCustom).toBe("Tổ chuyên môn");
    expect(dep.subjectParentIds).toEqual(["sp-math"]);
  });

  it("applies the derived activeAssignmentCount (default 0)", () => {
    expect(StaffingMapper.toDepartment(dto, 5).activeAssignmentCount).toBe(5);
    expect(StaffingMapper.toDepartment(dto).activeAssignmentCount).toBe(0);
  });

  it("preserves null concept-label fields", () => {
    const dep = StaffingMapper.toDepartment({
      ...dto,
      conceptLabelSuggested: null,
      conceptLabelCustom: null,
    });
    expect(dep.conceptLabelSuggested).toBeNull();
    expect(dep.conceptLabelCustom).toBeNull();
  });
});

describe("StaffingMapper.toPositionTitle", () => {
  const dto: PositionTitleResponseDto = {
    positionTitleId: "pt-1",
    tenantId: "t-1",
    name: "Tổ trưởng",
    scopeType: "SUBJECT_PARENT",
    permissions: ["VIEW_SUBJECT_CONTENT", "MANAGE_SUBJECT_CONTENT"],
    status: "ACTIVE",
    createdAt: "2025-08-01T00:00:00.000Z",
    updatedAt: "2025-08-01T00:00:00.000Z",
  };

  it("maps positionTitleId → id and carries the 6-value permission enum", () => {
    const title = StaffingMapper.toPositionTitle(dto, 2);
    expect(title.id).toBe("pt-1");
    expect(title.permissions).toEqual([
      "VIEW_SUBJECT_CONTENT",
      "MANAGE_SUBJECT_CONTENT",
    ]);
    expect(title.activeAssignmentCount).toBe(2);
  });
});

describe("StaffingMapper.toPositionAssignment", () => {
  const dto: PositionAssignmentResponseDto = {
    positionAssignmentId: "pa-1",
    tenantId: "t-1",
    positionTitleId: "pt-1",
    memberId: "m-101",
    scopeEntityType: "SUBJECT_PARENT",
    scopeEntityId: "sp-math",
    academicYearId: "ay-2025",
    status: "ACTIVE",
    createdAt: "2025-08-15T00:00:00.000Z",
    updatedAt: "2025-08-15T00:00:00.000Z",
  };

  it("maps ids, createdAt → assignedAt, and joins names", () => {
    const a = StaffingMapper.toPositionAssignment(dto, {
      memberName: "Nguyễn Văn A",
      positionTitleName: "Tổ trưởng",
    });
    expect(a.id).toBe("pa-1");
    expect(a.assignedAt).toBe("2025-08-15T00:00:00.000Z");
    expect(a.memberName).toBe("Nguyễn Văn A");
    expect(a.positionTitleName).toBe("Tổ trưởng");
    expect(a.status).toBe("ACTIVE");
  });

  it("maps wire status ARCHIVED → domain REVOKED", () => {
    const a = StaffingMapper.toPositionAssignment(
      { ...dto, status: "ARCHIVED" },
      { memberName: "x", positionTitleName: "y" },
    );
    expect(a.status).toBe("REVOKED");
  });
});
