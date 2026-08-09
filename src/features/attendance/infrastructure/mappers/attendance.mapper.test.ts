import { describe, expect, it } from "vitest";
import type {
  ClassAttendanceRangeRecordDto,
  ClassAttendanceResponseDto,
} from "../dtos/class-attendance-response.dto";
import {
  aggregateRangeDaySummaries,
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

  it("yields one row per ENROLLED student, defaulting the unmarked to present", () => {
    const dto: ClassAttendanceResponseDto = {
      classId: "c-1",
      date: "2026-06-07",
      records: [{ studentMemberId: "s2", status: "ABSENT" }],
    };
    const roster = mapClassAttendance(
      dto,
      new Map([
        ["s1", "An"],
        ["s2", "Binh"],
      ]),
      ["s1", "s2"],
    );
    expect(roster.records).toEqual([
      { studentId: "s1", studentName: "An", status: "present" },
      { studentId: "s2", studentName: "Binh", status: "absent" },
    ]);
  });

  it("still renders the roster on a day nobody has marked yet", () => {
    const dto: ClassAttendanceResponseDto = {
      classId: "c-1",
      date: "2026-06-07",
      records: [],
    };
    const roster = mapClassAttendance(dto, new Map(), ["s1"]);
    expect(roster.records).toEqual([
      { studentId: "s1", studentName: "s1", status: "present" },
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

describe("aggregateRangeDaySummaries (US-E18.47 — flat range records)", () => {
  const dates = ["2026-06-01", "2026-06-02", "2026-06-03"];

  it("groups the flat records by date into per-day status counts", () => {
    const records: ClassAttendanceRangeRecordDto[] = [
      { date: dates[0], studentMemberId: "s1", status: "PRESENT" },
      { date: dates[0], studentMemberId: "s2", status: "LATE" },
      { date: dates[2], studentMemberId: "s1", status: "ABSENT" },
      { date: dates[2], studentMemberId: "s2", status: "EXCUSED_ABSENT" },
    ];

    const summaries = aggregateRangeDaySummaries(dates, records, 2);

    expect(summaries).toEqual([
      {
        date: dates[0],
        counts: { present: 1, absent: 0, late: 1, excusedAbsent: 0 },
        totalStudents: 2,
      },
      { date: dates[1], counts: zeroCounts(), totalStudents: 2 },
      {
        date: dates[2],
        counts: { present: 0, absent: 1, late: 0, excusedAbsent: 1 },
        totalStudents: 2,
      },
    ]);
  });

  it("emits a zero-count summary for every requested day with no records (a day never recorded reads the same as a day recorded empty — the pre-US-E18.47 fan-out made no distinction either)", () => {
    const summaries = aggregateRangeDaySummaries(dates, [], 5);

    expect(summaries.map((s) => s.date)).toEqual(dates);
    for (const s of summaries) {
      expect(s.counts).toEqual(zeroCounts());
      expect(s.totalStudents).toBe(5);
    }
  });

  it("keeps one summary per requested day and preserves the requested order", () => {
    const records: ClassAttendanceRangeRecordDto[] = [
      { date: dates[2], studentMemberId: "s1", status: "PRESENT" },
      { date: dates[0], studentMemberId: "s1", status: "PRESENT" },
    ];

    const summaries = aggregateRangeDaySummaries(dates, records, 1);

    expect(summaries).toHaveLength(dates.length);
    expect(summaries.map((s) => s.date)).toEqual(dates);
  });

  it("ignores records dated outside the requested range instead of inventing a day", () => {
    const records: ClassAttendanceRangeRecordDto[] = [
      { date: "2026-05-31", studentMemberId: "s1", status: "PRESENT" },
      { date: dates[1], studentMemberId: "s1", status: "PRESENT" },
    ];

    const summaries = aggregateRangeDaySummaries(dates, records, 1);

    expect(summaries.map((s) => s.date)).toEqual(dates);
    expect(summaries[1].counts.present).toBe(1);
  });
});
