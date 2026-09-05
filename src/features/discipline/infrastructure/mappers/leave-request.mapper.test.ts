import { describe, expect, it } from "vitest";
import type { StudentLeaveRequestResponseDto } from "../dtos/student-leave-request-response.dto";
import {
  countLeaveDays,
  leaveAvatarToneFor,
  toLeaveRequestEntity,
} from "./leave-request.mapper";

function dto(
  over: Partial<StudentLeaveRequestResponseDto> = {},
): StudentLeaveRequestResponseDto {
  return {
    requestId: "req-1",
    studentMemberId: "stu-1",
    classId: "cls-10a1",
    startDate: "2026-05-02",
    endDate: "2026-05-02",
    reason: "Khám bệnh định kỳ tại bệnh viện",
    state: "SUBMITTED",
    submittedByMemberId: "stu-1",
    createdAt: "2026-04-29T08:00:00Z",
    updatedAt: "2026-04-29T08:00:00Z",
    ...over,
  };
}

const names = new Map<string, string>([
  ["stu-1", "Nguyễn Minh Khoa"],
  ["par-1", "Nguyễn Văn Đức"],
  ["gvcn-1", "Nguyễn Thị Hương"],
]);

describe("toLeaveRequestEntity — real core wire → entity", () => {
  it("maps the addressing + display fields, resolving names from the batch lookup", () => {
    const entity = toLeaveRequestEntity(dto(), names, "10A1");

    expect(entity.id).toBe("req-1");
    expect(entity.studentId).toBe("stu-1");
    expect(entity.studentName).toBe("Nguyễn Minh Khoa");
    expect(entity.initials).toBe("KN");
    expect(entity.classId).toBe("cls-10a1");
    expect(entity.className).toBe("10A1");
    expect(entity.reason).toBe("Khám bệnh định kỳ tại bệnh viện");
  });

  it("formats both dates as DD/MM/YYYY and counts the inclusive span", () => {
    const entity = toLeaveRequestEntity(
      dto({ startDate: "2026-04-30", endDate: "2026-05-02" }),
      names,
      "10A1",
    );

    expect(entity.startDate).toBe("30/04/2026");
    expect(entity.endDate).toBe("02/05/2026");
    expect(entity.dayCount).toBe(3);
  });

  it("falls back to the raw member id when no display name resolved (never a blank row)", () => {
    const entity = toLeaveRequestEntity(
      dto({
        studentMemberId: "stu-unknown",
        submittedByMemberId: "stu-unknown",
      }),
      names,
      "10A1",
    );

    expect(entity.studentName).toBe("stu-unknown");
    expect(entity.submitterName).toBe("stu-unknown");
  });

  it("leaves className empty when the caller has no class name to stamp (the wire carries none)", () => {
    expect(toLeaveRequestEntity(dto(), names).className).toBe("");
  });

  describe("submittedBy is INFERRED — the wire has no author-kind field", () => {
    it("submitter === student → student", () => {
      const entity = toLeaveRequestEntity(dto(), names, "10A1");
      expect(entity.submittedBy).toBe("student");
      expect(entity.submitterName).toBe("Nguyễn Minh Khoa");
    });

    it("submitter !== student → parent", () => {
      const entity = toLeaveRequestEntity(
        dto({ submittedByMemberId: "par-1" }),
        names,
        "10A1",
      );
      expect(entity.submittedBy).toBe("parent");
      expect(entity.submitterName).toBe("Nguyễn Văn Đức");
    });
  });

  describe("state → status (1:1, unlike violations)", () => {
    it("SUBMITTED → pending, with no decider on either side", () => {
      const entity = toLeaveRequestEntity(
        dto({ state: "SUBMITTED", approverMemberId: "gvcn-1" }),
        names,
        "10A1",
      );
      expect(entity.status).toBe("pending");
      // A still-SUBMITTED request has not been decided by anyone, even if the
      // wire echoed an approver id — the STATE is the authority.
      expect(entity.approvedBy).toBeNull();
      expect(entity.rejectedBy).toBeNull();
    });

    it("APPROVED → approved, approver resolved into approvedBy only", () => {
      const entity = toLeaveRequestEntity(
        dto({ state: "APPROVED", approverMemberId: "gvcn-1" }),
        names,
        "10A1",
      );
      expect(entity.status).toBe("approved");
      expect(entity.approvedBy).toBe("Nguyễn Thị Hương");
      expect(entity.rejectedBy).toBeNull();
    });

    it("REJECTED → rejected, approver resolved into rejectedBy + the reason carried", () => {
      const entity = toLeaveRequestEntity(
        dto({
          state: "REJECTED",
          approverMemberId: "gvcn-1",
          rejectionReason: "Đã nghỉ quá 5 ngày trong tháng",
        }),
        names,
        "10A1",
      );
      expect(entity.status).toBe("rejected");
      expect(entity.rejectedBy).toBe("Nguyễn Thị Hương");
      expect(entity.approvedBy).toBeNull();
      expect(entity.rejectionReason).toBe("Đã nghỉ quá 5 ngày trong tháng");
    });
  });

  it("hardcodes type `other` — core has no leave-type concept for students", () => {
    expect(toLeaveRequestEntity(dto(), names, "10A1").type).toBe("other");
  });

  it("derives a deterministic avatar tone from the student id (no wire source)", () => {
    const a = toLeaveRequestEntity(dto(), names, "10A1").avatarTone;
    const b = toLeaveRequestEntity(dto(), names, "10A1").avatarTone;
    expect(a).toBe(b);
    expect(leaveAvatarToneFor("stu-1")).toBe(a);
  });
});

describe("countLeaveDays", () => {
  it("counts a single-day leave as 1", () => {
    expect(countLeaveDays("2026-05-02", "2026-05-02")).toBe(1);
  });

  it("counts an inclusive multi-day span", () => {
    expect(countLeaveDays("2026-04-30", "2026-05-02")).toBe(3);
  });

  it("never returns less than 1 for an inverted range (BE rejects it; the UI must not show 0 or a negative)", () => {
    expect(countLeaveDays("2026-05-02", "2026-04-30")).toBe(1);
  });

  it("returns 1 for an unparseable date rather than NaN", () => {
    expect(countLeaveDays("not-a-date", "2026-05-02")).toBe(1);
  });
});
