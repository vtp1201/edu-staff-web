import { describe, expect, it } from "vitest";
import type { AttendanceStatus } from "./entities/attendance-status.entity";
import {
  type ClassAttendanceRangeRecord,
  type ClassRosterEntry,
  summarizeClassAttendance,
} from "./summarize-class-attendance";

function roster(...ids: string[]): ClassRosterEntry[] {
  return ids.map((id) => ({ studentId: id, name: `HS ${id}` }));
}

function rec(
  studentId: string,
  status: AttendanceStatus,
  date = "2026-04-01",
): ClassAttendanceRangeRecord {
  return { studentId, status, date };
}

/** `n` records of `status` for one student (dates are irrelevant to counting). */
function repeat(
  studentId: string,
  status: AttendanceStatus,
  n: number,
): ClassAttendanceRangeRecord[] {
  return Array.from({ length: n }, (_, i) =>
    rec(studentId, status, `2026-04-${String(i + 1).padStart(2, "0")}`),
  );
}

describe("summarizeClassAttendance — per-student counts", () => {
  it("counts every status separately and keeps the roster order as the row order", () => {
    const summary = summarizeClassAttendance(
      [
        rec("s2", "present"),
        rec("s1", "present"),
        rec("s1", "absent", "2026-04-02"),
        rec("s1", "late", "2026-04-03"),
        rec("s1", "excusedAbsent", "2026-04-04"),
      ],
      roster("s1", "s2"),
    );

    expect(summary.students.map((s) => s.studentId)).toEqual(["s1", "s2"]);
    expect(summary.students[0]).toMatchObject({
      studentId: "s1",
      name: "HS s1",
      present: 1,
      absent: 1,
      late: 1,
      excused: 1,
      recorded: 4,
    });
  });

  it("ignores records for a student who is not on the roster", () => {
    const summary = summarizeClassAttendance(
      [rec("ghost", "absent"), rec("s1", "present")],
      roster("s1"),
    );

    expect(summary.students).toHaveLength(1);
    expect(summary.students[0]?.recorded).toBe(1);
  });
});

describe("summarizeClassAttendance — LATE semantics (ADR 0058 / BE US-245)", () => {
  it("counts a LATE day in `recorded` but NOT in the rate numerator", () => {
    // 9 present + 1 late = 10 recorded days, 90% (not 100%).
    const summary = summarizeClassAttendance(
      [...repeat("s1", "present", 9), rec("s1", "late", "2026-04-10")],
      roster("s1"),
    );

    const s1 = summary.students[0];
    expect(s1?.recorded).toBe(10);
    expect(s1?.late).toBe(1);
    expect(s1?.rate).toBe(90);
  });
});

describe("summarizeClassAttendance — zero-record students", () => {
  it("gives a student with no record `rate: null` and `band: null`", () => {
    const summary = summarizeClassAttendance(
      [rec("s1", "present")],
      roster("s1", "s2"),
    );

    expect(summary.students[1]).toMatchObject({
      studentId: "s2",
      recorded: 0,
      present: 0,
      rate: null,
      band: null,
    });
  });

  it("excludes zero-record students from `meanRate`", () => {
    // s1 = 100%, s2 = 0 records. Mean must be 100, NOT 50.
    const summary = summarizeClassAttendance(
      repeat("s1", "present", 4),
      roster("s1", "s2"),
    );

    expect(summary.meanRate).toBe(100);
  });

  it("returns `meanRate: null` when nobody has a record", () => {
    const summary = summarizeClassAttendance([], roster("s1", "s2"));

    expect(summary.meanRate).toBeNull();
    expect(summary.students.every((s) => s.rate === null)).toBe(true);
  });
});

describe("summarizeClassAttendance — band boundaries (closed intervals)", () => {
  /** Build a student whose rate is exactly `present`/`total` %. */
  function bandOf(present: number, total: number) {
    const records = [
      ...repeat("s1", "present", present),
      ...Array.from({ length: total - present }, (_, i) =>
        rec("s1", "absent", `2026-05-${String(i + 1).padStart(2, "0")}`),
      ),
    ];
    const summary = summarizeClassAttendance(records, roster("s1"));
    return summary.students[0];
  }

  it.each([
    { present: 1000, total: 1000, rate: 100, band: "ok" },
    { present: 950, total: 1000, rate: 95, band: "ok" },
    { present: 949, total: 1000, rate: 94.9, band: "watch" },
    { present: 900, total: 1000, rate: 90, band: "watch" },
    { present: 899, total: 1000, rate: 89.9, band: "risk" },
    { present: 0, total: 1000, rate: 0, band: "risk" },
  ])("$rate% → $band", ({ present, total, rate, band }) => {
    const student = bandOf(present, total);
    expect(student?.rate).toBe(rate);
    expect(student?.band).toBe(band);
  });
});

describe("summarizeClassAttendance — meanRate", () => {
  it("averages the per-student rates to one decimal", () => {
    // s1 = 100%, s2 = 50% → mean 75%.
    const summary = summarizeClassAttendance(
      [
        ...repeat("s1", "present", 2),
        rec("s2", "present", "2026-04-01"),
        rec("s2", "absent", "2026-04-02"),
      ],
      roster("s1", "s2"),
    );

    expect(summary.meanRate).toBe(75);
  });

  it("rounds the mean to one decimal (no floating-point tail)", () => {
    // 100%, 100%, 0% → 66.666… → 66.7
    const summary = summarizeClassAttendance(
      [rec("s1", "present"), rec("s2", "present"), rec("s3", "absent")],
      roster("s1", "s2", "s3"),
    );

    expect(summary.meanRate).toBe(66.7);
  });
});
