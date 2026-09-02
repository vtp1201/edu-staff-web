import { describe, expect, it } from "vitest";
import type { ClassRosterItemDto } from "../dtos/class-roster-response.dto";
import { toHomeroomKpi, toTeacherRosterStudent } from "./teacher-class.mapper";

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

// ── US-E24.7: GVCN KPI composition ────────────────────────────────────────
describe("toHomeroomKpi (US-E24.7)", () => {
  it("parses the draft attendance rate string into a 0..1 number", () => {
    const kpi = toHomeroomKpi({ attendance: { rate: "0.87" } });
    expect(kpi.attendanceRate).toBe(0.87);
  });

  it("treats an empty rate (no recorded day) as absent, not zero", () => {
    const kpi = toHomeroomKpi({ attendance: { rate: "" } });
    expect(kpi.attendanceRate).toBeUndefined();
    expect(kpi.attendanceRate).not.toBe(0);
  });

  it("leaves attendanceRate undefined when the summary call is absent", () => {
    expect(toHomeroomKpi({}).attendanceRate).toBeUndefined();
  });

  it("counts ONLY SUBMITTED violations (the list carries every state)", () => {
    const kpi = toHomeroomKpi({
      violations: [
        { state: "SUBMITTED" },
        { state: "DRAFT" },
        { state: "APPROVED" },
        { state: "SUBMITTED" },
        { state: "REJECTED" },
      ],
    });
    expect(kpi.openViolations).toBe(2);
  });

  it("reports zero open violations for a class with only settled records", () => {
    expect(
      toHomeroomKpi({ violations: [{ state: "APPROVED" }] }).openViolations,
    ).toBe(0);
  });

  it("leaves openViolations undefined when the violations call failed", () => {
    expect(toHomeroomKpi({}).openViolations).toBeUndefined();
  });

  it("passes the already server-filtered leave-request count straight through", () => {
    expect(toHomeroomKpi({ pendingLeaveCount: 3 }).pendingLeave).toBe(3);
    expect(toHomeroomKpi({ pendingLeaveCount: 0 }).pendingLeave).toBe(0);
    expect(toHomeroomKpi({}).pendingLeave).toBeUndefined();
  });

  it("marks the count as capped when the violations list had more pages", () => {
    const kpi = toHomeroomKpi({
      violations: [{ state: "SUBMITTED" }, { state: "SUBMITTED" }],
      violationsHasMore: true,
    });
    // The repo counts ONE page only, so the real total is >= 2 — the card must
    // be able to say "2+" instead of asserting an audit-exact 2.
    expect(kpi.openViolations).toBe(2);
    expect(kpi.openViolationsCapped).toBe(true);
  });

  it("leaves the count uncapped when the single page was the whole list", () => {
    const kpi = toHomeroomKpi({
      violations: [{ state: "SUBMITTED" }],
      violationsHasMore: false,
    });
    expect(kpi.openViolations).toBe(1);
    expect(kpi.openViolationsCapped).toBeUndefined();
  });

  it("never flags real fields as demo data", () => {
    const kpi = toHomeroomKpi({
      violations: [{ state: "SUBMITTED" }],
      pendingLeaveCount: 1,
    });
    expect(kpi.demoFields).toEqual([]);
  });
});
