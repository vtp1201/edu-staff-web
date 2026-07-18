import { describe, expect, it } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { ClassAttendanceResponseDto } from "../dtos/class-attendance-response.dto";
import {
  aggregateDaySummaries,
  countStatuses,
  mapAttendanceRecord,
  mapClassAttendance,
  mapStatusFromWire,
  mapStatusToWire,
  zeroCounts,
} from "./attendance.mapper";

describe("mapStatusFromWire / mapStatusToWire", () => {
  it("round-trips all 4 statuses", () => {
    const pairs: Array<[string, string]> = [
      ["PRESENT", "present"],
      ["ABSENT", "absent"],
      ["LATE", "late"],
      ["EXCUSED_ABSENT", "excusedAbsent"],
    ];
    for (const [wire, domain] of pairs) {
      expect(mapStatusFromWire(wire as never)).toBe(domain);
      expect(mapStatusToWire(domain as never)).toBe(wire);
    }
  });
});

describe("mapAttendanceRecord", () => {
  it("joins studentName from the name map", () => {
    const record = mapAttendanceRecord(
      { studentMemberId: "s1", status: "PRESENT" },
      new Map([["s1", "Nguyễn Văn An"]]),
    );
    expect(record).toEqual({
      studentId: "s1",
      studentName: "Nguyễn Văn An",
      status: "present",
    });
  });

  it("falls back to the raw member id when the name is missing/blank", () => {
    expect(
      mapAttendanceRecord(
        { studentMemberId: "s2", status: "ABSENT" },
        new Map(),
      ).studentName,
    ).toBe("s2");
    expect(
      mapAttendanceRecord(
        { studentMemberId: "s3", status: "LATE" },
        new Map([["s3", "   "]]),
      ).studentName,
    ).toBe("s3");
  });
});

describe("mapClassAttendance", () => {
  it("maps the envelope payload to an AttendanceRoster", () => {
    const dto: ClassAttendanceResponseDto = {
      classId: "c-1",
      date: "2026-06-07",
      records: [{ studentMemberId: "s1", status: "LATE" }],
    };
    const roster = mapClassAttendance(dto, new Map([["s1", "An"]]));
    expect(roster.classDate).toEqual({ classId: "c-1", date: "2026-06-07" });
    expect(roster.records).toEqual([
      { studentId: "s1", studentName: "An", status: "late" },
    ]);
  });
});

describe("countStatuses / zeroCounts", () => {
  it("counts each status bucket", () => {
    expect(countStatuses(["present", "present", "late", "absent"])).toEqual({
      present: 2,
      absent: 1,
      late: 1,
      excusedAbsent: 0,
    });
  });

  it("zeroCounts starts every bucket at 0", () => {
    expect(zeroCounts()).toEqual({
      present: 0,
      absent: 0,
      late: 0,
      excusedAbsent: 0,
    });
  });
});

describe("aggregateDaySummaries", () => {
  const dates = ["2026-06-01", "2026-06-02", "2026-06-03"];

  it("aggregates fulfilled days into status counts", () => {
    const results: PromiseSettledResult<ClassAttendanceResponseDto>[] = [
      {
        status: "fulfilled",
        value: {
          classId: "c-1",
          date: dates[0],
          records: [
            { studentMemberId: "s1", status: "PRESENT" },
            { studentMemberId: "s2", status: "LATE" },
          ],
        },
      },
      {
        status: "fulfilled",
        value: { classId: "c-1", date: dates[1], records: [] },
      },
      {
        status: "fulfilled",
        value: { classId: "c-1", date: dates[2], records: [] },
      },
    ];

    const summaries = aggregateDaySummaries(dates, results, 2);
    expect(summaries[0]).toEqual({
      date: dates[0],
      counts: { present: 1, absent: 0, late: 1, excusedAbsent: 0 },
      totalStudents: 2,
    });
  });

  it("treats ATTENDANCE_NOT_FOUND as a legitimate zero-count day", () => {
    const notFound = new ApiError({
      code: "ATTENDANCE_NOT_FOUND",
      message: "not found",
      retryable: false,
    });
    const results: PromiseSettledResult<ClassAttendanceResponseDto>[] = [
      { status: "rejected", reason: notFound },
      {
        status: "fulfilled",
        value: { classId: "c-1", date: dates[1], records: [] },
      },
      { status: "rejected", reason: notFound },
    ];

    const summaries = aggregateDaySummaries(dates, results, 5);
    expect(summaries).toHaveLength(3);
    expect(summaries[0].counts).toEqual(zeroCounts());
    expect(summaries[0].totalStudents).toBe(5);
  });

  it("omits days that failed for another reason when SOME days succeed (partial failure)", () => {
    const forbidden = new ApiError({
      code: "ATTENDANCE_FORBIDDEN",
      message: "forbidden",
      retryable: false,
    });
    const results: PromiseSettledResult<ClassAttendanceResponseDto>[] = [
      {
        status: "fulfilled",
        value: { classId: "c-1", date: dates[0], records: [] },
      },
      { status: "rejected", reason: forbidden },
      {
        status: "fulfilled",
        value: { classId: "c-1", date: dates[2], records: [] },
      },
    ];

    const summaries = aggregateDaySummaries(dates, results, 0);
    expect(summaries.map((s) => s.date)).toEqual([dates[0], dates[2]]);
  });

  it("re-throws the aggregate failure when EVERY day fails for a non-not-found reason", () => {
    const forbidden = new ApiError({
      code: "ATTENDANCE_FORBIDDEN",
      message: "forbidden",
      retryable: false,
    });
    const results: PromiseSettledResult<ClassAttendanceResponseDto>[] =
      dates.map(() => ({ status: "rejected" as const, reason: forbidden }));

    expect(() => aggregateDaySummaries(dates, results, 0)).toThrow(forbidden);
  });
});
