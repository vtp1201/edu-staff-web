/**
 * Unit tests — StaffLeaveMapper (US-E18.36).
 *
 * The wire row is narrow (ids + ISO dates + enums); every display field is
 * derived here or resolved from the IAM directory. The two nullable fields
 * added by core US-170 have DIFFERENT null reasons and must stay
 * distinguishable all the way to presentation — the mapper therefore keeps
 * them as `null`, never as an invented value or an empty string.
 */
import { describe, expect, it } from "vitest";
import type { MemberSummary } from "@/features/iam-directory/domain/entities/member-summary.entity";
import type { StaffLeaveResponseDto } from "../dtos/staff-leave-response.dto";
import {
  avatarToneFor,
  daysBetween,
  initialsOf,
  StaffLeaveMapper,
  toDisplayDate,
  toDisplayDateTime,
} from "./staff-leave.mapper";

const BASE: StaffLeaveResponseDto = {
  requestId: "req-1",
  staffMemberId: "mem-1",
  startDate: "2026-05-03",
  endDate: "2026-05-05",
  reason: "Khám sức khoẻ định kỳ",
  state: "SUBMITTED",
  selfApproved: false,
  leaveType: "SICK",
  department: "Tổ Toán",
  createdAt: "2026-04-29T09:10:00Z",
  updatedAt: "2026-04-29T09:10:00Z",
};

function members(...rows: MemberSummary[]): Map<string, MemberSummary> {
  return new Map(rows.map((r) => [r.memberId, r]));
}

describe("StaffLeaveMapper.toEntity — wire → entity", () => {
  it("maps the fully populated row (dates formatted, enums lowercased)", () => {
    const entity = StaffLeaveMapper.toEntity(
      BASE,
      members({
        memberId: "mem-1",
        displayName: "Nguyễn Thị Hương",
        roles: ["TEACHER"],
      }),
    );

    expect(entity).toMatchObject({
      id: "req-1",
      staffId: "mem-1",
      staffName: "Nguyễn Thị Hương",
      initials: "HN",
      staffRole: "teacher",
      department: "Tổ Toán",
      leaveType: "sick",
      startDate: "03/05/2026",
      endDate: "05/05/2026",
      days: 3,
      status: "pending",
      submittedAt: "29/04/2026 09:10",
      approvedBy: null,
      rejectedBy: null,
      rejectionReason: null,
    });
  });

  it("keeps leaveType null (LEGACY-ROW gap) without inventing a category", () => {
    const entity = StaffLeaveMapper.toEntity(
      { ...BASE, leaveType: null },
      members(),
    );
    expect(entity.leaveType).toBeNull();
    // The other nullable field is untouched — the two nulls are independent.
    expect(entity.department).toBe("Tổ Toán");
  });

  it("keeps department null (ONGOING no-assignment state) without inventing a name", () => {
    const entity = StaffLeaveMapper.toEntity(
      { ...BASE, department: null },
      members(),
    );
    expect(entity.department).toBeNull();
    expect(entity.leaveType).toBe("sick");
  });

  it("treats an ABSENT leaveType/department key exactly like an explicit null", () => {
    const { leaveType: _lt, department: _dep, ...narrow } = BASE;
    const entity = StaffLeaveMapper.toEntity(narrow, members());
    expect(entity.leaveType).toBeNull();
    expect(entity.department).toBeNull();
  });

  it("ignores an unrecognised leaveType rather than passing it through", () => {
    const entity = StaffLeaveMapper.toEntity(
      { ...BASE, leaveType: "SABBATICAL" as never },
      members(),
    );
    expect(entity.leaveType).toBeNull();
  });

  it("maps APPROVED → approved and resolves the approver's name from IAM", () => {
    const entity = StaffLeaveMapper.toEntity(
      {
        ...BASE,
        state: "APPROVED",
        approverMemberId: "mem-9",
        updatedAt: "2026-04-30T02:05:00Z",
      },
      members(
        { memberId: "mem-1", displayName: "Nguyễn Thị Hương" },
        { memberId: "mem-9", displayName: "Trần Minh Quân" },
      ),
    );

    expect(entity.status).toBe("approved");
    expect(entity.approvedBy).toBe("Trần Minh Quân");
    expect(entity.approvedAt).toBe("30/04/2026 02:05");
    expect(entity.rejectedBy).toBeNull();
    expect(entity.rejectedAt).toBeNull();
  });

  it("maps REJECTED → rejected with the rejection reason and rejecter", () => {
    const entity = StaffLeaveMapper.toEntity(
      {
        ...BASE,
        state: "REJECTED",
        approverMemberId: "mem-9",
        rejectionReason: "Trùng lịch hội nghị.",
        updatedAt: "2026-04-30T02:05:00Z",
      },
      members({ memberId: "mem-9", displayName: "Trần Minh Quân" }),
    );

    expect(entity.status).toBe("rejected");
    expect(entity.rejectedBy).toBe("Trần Minh Quân");
    expect(entity.rejectedAt).toBe("30/04/2026 02:05");
    expect(entity.approvedBy).toBeNull();
    expect(entity.rejectionReason).toBe("Trùng lịch hội nghị.");
  });

  it("falls back to the raw member id when IAM cannot resolve the name", () => {
    const entity = StaffLeaveMapper.toEntity(BASE, members());
    expect(entity.staffName).toBe("mem-1");
    expect(entity.initials).toBe("?");
  });

  it("leaves staffRole null when the directory row carries no roles", () => {
    const entity = StaffLeaveMapper.toEntity(
      BASE,
      members({ memberId: "mem-1", displayName: "Nguyễn Thị Hương" }),
    );
    expect(entity.staffRole).toBeNull();
  });

  it("maps a non-teacher directory role to the staff badge", () => {
    const entity = StaffLeaveMapper.toEntity(
      BASE,
      members({
        memberId: "mem-1",
        displayName: "Hoàng Văn Trí",
        roles: ["STAFF"],
      }),
    );
    expect(entity.staffRole).toBe("staff");
  });
});

describe("derivation helpers", () => {
  it("daysBetween counts both endpoints (single-day = 1)", () => {
    expect(daysBetween("2026-05-03", "2026-05-03")).toBe(1);
    expect(daysBetween("2026-05-03", "2026-05-05")).toBe(3);
  });

  it("daysBetween never returns a negative span", () => {
    expect(daysBetween("2026-05-05", "2026-05-03")).toBe(1);
    expect(daysBetween("", "")).toBe(1);
  });

  it("toDisplayDate reformats an ISO date, passing through junk unchanged", () => {
    expect(toDisplayDate("2026-05-03")).toBe("03/05/2026");
    expect(toDisplayDate("nonsense")).toBe("nonsense");
  });

  it("toDisplayDateTime is UTC-deterministic (locale-stable in CI)", () => {
    expect(toDisplayDateTime("2026-04-29T09:10:00Z")).toBe("29/04/2026 09:10");
    expect(toDisplayDateTime(null)).toBeNull();
  });

  it("initialsOf derives 2 letters, '?' for an unusable name", () => {
    expect(initialsOf("Nguyễn Thị Hương")).toBe("HN");
    expect(initialsOf("Hương")).toBe("H");
    expect(initialsOf("   ")).toBe("?");
  });

  it("avatarToneFor is a stable token-palette pick per member id", () => {
    const tone = avatarToneFor("mem-1");
    expect(avatarToneFor("mem-1")).toBe(tone);
    expect(tone).toMatch(/^var\(--edu-[a-z]+\)$/);
  });
});
