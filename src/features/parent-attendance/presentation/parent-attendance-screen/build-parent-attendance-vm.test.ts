import { describe, expect, it } from "vitest";
import type { AttendanceStatus } from "@/features/attendance/domain/entities/attendance-status.entity";
import type { ParentAttendanceFailure } from "../../domain/failures/parent-attendance.failure";
import {
  ATTENDANCE_STATUS_ORDER,
  ATTENDANCE_STATUS_TONE,
  countByStatus,
  formatIsoDate,
  isRetryableFailure,
} from "./build-parent-attendance-vm";

describe("ATTENDANCE_STATUS_TONE", () => {
  it("matches the teacher-facing attendance tone table (ADR 0058)", () => {
    expect(ATTENDANCE_STATUS_TONE).toEqual({
      present: "success",
      late: "info",
      excusedAbsent: "warning",
      absent: "error",
    });
  });

  it("covers every status exactly once, in the documented order", () => {
    expect([...ATTENDANCE_STATUS_ORDER].sort()).toEqual(
      Object.keys(ATTENDANCE_STATUS_TONE).sort(),
    );
  });
});

describe("isRetryableFailure", () => {
  const table: [ParentAttendanceFailure["type"], boolean][] = [
    ["forbidden", false],
    ["invalid-date-range", false],
    ["date-range-too-large", false],
    ["network-error", true],
    ["unknown", true],
  ];

  it.each(table)("%s → retryable=%s", (key, expected) => {
    expect(isRetryableFailure(key)).toBe(expected);
  });
});

describe("countByStatus", () => {
  it("counts each status and reports zeros for absent statuses", () => {
    const records: { status: AttendanceStatus }[] = [
      { status: "present" },
      { status: "present" },
      { status: "late" },
    ];

    expect(countByStatus(records)).toEqual({
      present: 2,
      late: 1,
      excusedAbsent: 0,
      absent: 0,
    });
  });

  it("returns all-zero for an empty list", () => {
    expect(countByStatus([])).toEqual({
      present: 0,
      late: 0,
      excusedAbsent: 0,
      absent: 0,
    });
  });
});

describe("formatIsoDate", () => {
  it("renders ISO days as DD/MM/YYYY", () => {
    expect(formatIsoDate("2026-08-03")).toBe("03/08/2026");
  });

  it("passes a non-ISO value through untouched", () => {
    expect(formatIsoDate("")).toBe("");
    expect(formatIsoDate("hôm nay")).toBe("hôm nay");
  });
});
