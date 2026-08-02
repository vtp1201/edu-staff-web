import { describe, expect, it } from "vitest";
import type { AttendanceStatus } from "@/features/attendance/domain/entities/attendance-status.entity";
import type { ParentAttendanceFailure } from "../../domain/failures/parent-attendance.failure";
import {
  ATTENDANCE_STATUS_ORDER,
  ATTENDANCE_STATUS_TONE,
  countByStatus,
  isRetryableFailure,
  parseIsoDate,
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

describe("parseIsoDate", () => {
  it("parses an ISO day to a timezone-stable instant", () => {
    const date = parseIsoDate("2026-08-03");
    expect(date).not.toBeNull();
    // Noon UTC: the calendar day is identical in every real-world timezone, so
    // the rendered date can never slip a day (and never mismatches on hydration
    // between server and browser).
    expect(date?.toISOString()).toBe("2026-08-03T12:00:00.000Z");
  });

  it("returns null for anything that is not a YYYY-MM-DD day", () => {
    expect(parseIsoDate("")).toBeNull();
    expect(parseIsoDate("hôm nay")).toBeNull();
    expect(parseIsoDate("2026-8-3")).toBeNull();
    expect(parseIsoDate("2026-08-03T00:00:00Z")).toBeNull();
  });

  it("rejects an out-of-range day instead of silently rolling it over", () => {
    expect(parseIsoDate("2026-02-30")).toBeNull();
    expect(parseIsoDate("2026-13-01")).toBeNull();
  });

  it("is locale-agnostic — ordering is decided by the formatter, not here", () => {
    // The screen renders it via next-intl's `useFormatter().dateTime`, so an
    // `en` reader gets MM/DD/YYYY and a `vi` reader DD/MM/YYYY from the SAME
    // value (regression guard for the hard-coded DD/MM/YYYY this replaced).
    const date = parseIsoDate("2026-08-03") as Date;
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    } as const;
    expect(new Intl.DateTimeFormat("vi", options).format(date)).toBe(
      "03/08/2026",
    );
    expect(new Intl.DateTimeFormat("en", options).format(date)).toBe(
      "08/03/2026",
    );
  });
});
