import { describe, expect, it } from "vitest";
import type { ChildAttendanceRecord } from "@/features/parent-attendance/domain/entities/child-attendance-record.entity";
import { summarizeAttendance } from "./summarize-attendance";

/**
 * US-E24.6 — the monthly/total rollup behind the student + parent attendance
 * summary block. Pure domain: no framework, no clock, no i18n.
 */
const rec = (
  date: string,
  status: ChildAttendanceRecord["status"],
): ChildAttendanceRecord => ({ date, status });

describe("summarizeAttendance — totals", () => {
  it("counts each status and computes the rate as present / all-recorded-days", () => {
    const result = summarizeAttendance([
      rec("2026-03-02", "present"),
      rec("2026-03-03", "present"),
      rec("2026-03-04", "excusedAbsent"),
      rec("2026-03-05", "absent"),
    ]);

    expect(result.summary).toEqual({
      total: 4,
      presentCount: 2,
      lateCount: 0,
      excusedCount: 1,
      unexcusedCount: 1,
      rate: 50,
    });
  });

  /**
   * BE US-245 semantics, restated in the packet: a LATE day is a day the
   * student was NOT marked present. It stays in the denominator (it is a
   * recorded school day) but never enters the numerator.
   */
  it("excludes LATE from the numerator while keeping it in the denominator", () => {
    const result = summarizeAttendance([
      rec("2026-03-02", "present"),
      rec("2026-03-03", "late"),
    ]);

    expect(result.summary.lateCount).toBe(1);
    expect(result.summary.total).toBe(2);
    expect(result.summary.rate).toBe(50);
  });

  it("rounds the rate to one decimal", () => {
    const records = [
      ...Array.from({ length: 27 }, (_, i) =>
        rec(`2026-03-${String(i + 1).padStart(2, "0")}`, "present" as const),
      ),
      rec("2026-03-28", "absent"),
    ];

    // 27/28 = 96.428…
    expect(summarizeAttendance(records).summary.rate).toBe(96.4);
  });

  /**
   * AC: "Không có bản ghi → StatCard 0/0 hiển thị '—' (không NaN)". The domain
   * answers `null` (= "no rate exists"); the em-dash is the presentation's job.
   */
  it("returns total 0 and a NULL rate — never NaN — for no records", () => {
    const result = summarizeAttendance([]);

    expect(result.summary.total).toBe(0);
    expect(result.summary.rate).toBeNull();
    expect(result.months).toEqual([]);
  });
});

describe("summarizeAttendance — monthly rollup", () => {
  it("splits records by YYYY-MM, ascending, with per-month P / KP / rate", () => {
    const result = summarizeAttendance([
      rec("2026-04-02", "absent"),
      rec("2026-03-02", "present"),
      rec("2026-03-03", "excusedAbsent"),
      rec("2026-04-01", "present"),
    ]);

    expect(result.months).toEqual([
      {
        month: "2026-03",
        total: 2,
        presentCount: 1,
        excusedCount: 1,
        unexcusedCount: 0,
        rate: 50,
      },
      {
        month: "2026-04",
        total: 2,
        presentCount: 1,
        excusedCount: 0,
        unexcusedCount: 1,
        rate: 50,
      },
    ]);
  });

  /** A month with no recorded day is ABSENT from the list, not a 0% row. */
  it("omits months that have zero records instead of emitting a zero row", () => {
    const result = summarizeAttendance([
      rec("2026-01-05", "present"),
      rec("2026-04-06", "present"),
    ]);

    expect(result.months.map((m) => m.month)).toEqual(["2026-01", "2026-04"]);
  });

  it("keeps LATE out of a month's numerator too", () => {
    const result = summarizeAttendance([
      rec("2026-05-04", "late"),
      rec("2026-05-05", "late"),
    ]);

    expect(result.months[0]).toEqual({
      month: "2026-05",
      total: 2,
      presentCount: 0,
      excusedCount: 0,
      unexcusedCount: 0,
      rate: 0,
    });
  });

  it("ignores a record whose date is not a YYYY-MM-DD calendar day", () => {
    const result = summarizeAttendance([
      rec("not-a-date", "present"),
      rec("2026-05-05", "present"),
    ]);

    // The bad row still counts toward the TOTAL (it is a recorded day the BE
    // sent) but cannot be filed under a month that does not exist.
    expect(result.summary.total).toBe(2);
    expect(result.months.map((m) => m.month)).toEqual(["2026-05"]);
  });
});
