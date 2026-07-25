import { describe, expect, it } from "vitest";
import type { StaffRosterEntry } from "../../domain/entities/staff-roster.entity";
import type { StaffConductNoteResponseDto } from "../dtos/staff-conduct-note-response.dto";
import type { StaffViolationResponseDto } from "../dtos/staff-violation-response.dto";
import {
  resolveRosterEntry,
  toStaffConductNoteEntity,
  toStaffViolationEntity,
} from "./staff-discipline.mapper";

const ROSTER: StaffRosterEntry[] = [
  {
    staffMemberId: "staff-1",
    staffName: "Nguyễn Thị Hương",
    department: "Tổ Toán",
    initials: "NH",
  },
  {
    staffMemberId: "staff-2",
    staffName: "Trần Văn Minh",
    department: "Tổ Lý-Hoá",
    initials: "TM",
  },
];

const violationDto: StaffViolationResponseDto = {
  recordId: "sv-001",
  staffMemberId: "staff-2",
  category: "professional",
  description: "Không nộp giáo án đúng hạn.",
  severity: "MINOR",
  occurredAt: "2026-04-28",
  state: "APPROVED",
  authorMemberId: "admin-1",
  approverMemberId: "admin-1",
  createdAt: "2026-04-29T08:00:00Z",
  updatedAt: "2026-04-29T08:00:00Z",
};

const noteDto: StaffConductNoteResponseDto = {
  termId: "HK1-2025-2026",
  staffMemberId: "staff-1",
  rating: "SATISFACTORY",
  note: "Hoàn thành tốt nhiệm vụ.",
  state: "SUBMITTED",
  authorMemberId: "admin-1",
  createdAt: "2026-01-10T09:00:00Z",
  updatedAt: "2026-01-10T09:00:00Z",
};

describe("resolveRosterEntry", () => {
  it("resolves display fields by staffMemberId", () => {
    expect(resolveRosterEntry(ROSTER, "staff-2").staffName).toBe(
      "Trần Văn Minh",
    );
  });

  it("falls back to a placeholder entry for an unknown id (never throws)", () => {
    const unknown = resolveRosterEntry(ROSTER, "staff-999");
    expect(unknown.staffMemberId).toBe("staff-999");
    expect(unknown.staffName).toBe("staff-999");
    expect(unknown.department).toBe("");
  });
});

describe("toStaffViolationEntity", () => {
  it("resolves staffName/department from the roster (never on the wire)", () => {
    const entity = toStaffViolationEntity(violationDto, ROSTER);
    expect(entity.staffName).toBe("Trần Văn Minh");
    expect(entity.department).toBe("Tổ Lý-Hoá");
  });

  it("derives selfApproved from author/approver even when the wire omits it (ADR 0073)", () => {
    const entity = toStaffViolationEntity(violationDto, ROSTER);
    expect(violationDto.selfApproved).toBeUndefined();
    expect(entity.selfApproved).toBe(true);
  });

  it("re-derives selfApproved even when the wire CONTRADICTS the ids", () => {
    const entity = toStaffViolationEntity(
      { ...violationDto, selfApproved: false },
      ROSTER,
    );
    expect(entity.selfApproved).toBe(true);
  });

  it("is false with a different approver and with no approver at all", () => {
    expect(
      toStaffViolationEntity(
        { ...violationDto, approverMemberId: "admin-2" },
        ROSTER,
      ).selfApproved,
    ).toBe(false);
    expect(
      toStaffViolationEntity(
        { ...violationDto, approverMemberId: undefined, state: "DRAFT" },
        ROSTER,
      ).selfApproved,
    ).toBe(false);
  });

  it("copies the remaining wire fields verbatim", () => {
    const entity = toStaffViolationEntity(violationDto, ROSTER);
    expect(entity).toMatchObject({
      recordId: "sv-001",
      category: "professional",
      severity: "MINOR",
      occurredAt: "2026-04-28",
      state: "APPROVED",
      authorMemberId: "admin-1",
      approverMemberId: "admin-1",
    });
  });
});

describe("toStaffConductNoteEntity", () => {
  it("resolves roster display fields and keeps the natural key", () => {
    const entity = toStaffConductNoteEntity(noteDto, ROSTER);
    expect(entity.staffName).toBe("Nguyễn Thị Hương");
    expect(entity.department).toBe("Tổ Toán");
    expect(entity.termId).toBe("HK1-2025-2026");
    expect(entity.staffMemberId).toBe("staff-1");
  });

  it("derives selfApproved the same way as violations (one shared rule)", () => {
    expect(toStaffConductNoteEntity(noteDto, ROSTER).selfApproved).toBe(false);
    expect(
      toStaffConductNoteEntity(
        { ...noteDto, state: "APPROVED", approverMemberId: "admin-1" },
        ROSTER,
      ).selfApproved,
    ).toBe(true);
  });

  it("carries the rejectionReason through when present", () => {
    const entity = toStaffConductNoteEntity(
      { ...noteDto, state: "REJECTED", rejectionReason: "Thiếu minh chứng." },
      ROSTER,
    );
    expect(entity.rejectionReason).toBe("Thiếu minh chứng.");
  });
});
