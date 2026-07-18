import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ATTENDANCE_EP } from "@/bootstrap/endpoint/attendance.endpoint";
import type { ApiEnvelope } from "@/bootstrap/lib/api-envelope";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { AttendanceRepository } from "./attendance.repository";

function envelope<T>(data: T): ApiEnvelope<T> {
  return {
    success: true,
    data,
    error: null,
    meta: { pagination: { nextCursor: null, hasMore: false } },
  };
}

function makeHttp(over: Partial<AxiosInstance> = {}) {
  return { get: vi.fn(), post: vi.fn(), ...over } as unknown as AxiosInstance;
}

describe("AttendanceRepository", () => {
  it("getMyHomeroomClasses filters to classes where currentUserId is the GVCN", async () => {
    const get = vi.fn().mockResolvedValue(
      envelope([
        { classId: "c-1", name: "10A1", homeroomTeacherId: "u-1" },
        { classId: "c-2", name: "10A2", homeroomTeacherId: "u-2" },
      ]),
    );
    const repo = new AttendanceRepository(makeHttp({ get }), "u-1");

    const classes = await repo.getMyHomeroomClasses();

    expect(get).toHaveBeenCalledWith(
      ATTENDANCE_EP.myClasses,
      expect.objectContaining({ raw: true }),
    );
    expect(classes).toEqual([{ id: "c-1", name: "10A1" }]);
  });

  it("getMyHomeroomClasses returns [] when currentUserId is null", async () => {
    const get = vi
      .fn()
      .mockResolvedValue(
        envelope([{ classId: "c-1", name: "10A1", homeroomTeacherId: "u-1" }]),
      );
    const repo = new AttendanceRepository(makeHttp({ get }), null);

    expect(await repo.getMyHomeroomClasses()).toEqual([]);
  });

  it("getClassAttendance fetches the day + roster in parallel and joins names", async () => {
    const get = vi.fn().mockImplementation((url: string) => {
      if (url === ATTENDANCE_EP.classAttendance("c-1")) {
        return Promise.resolve({
          classId: "c-1",
          date: "2026-06-07",
          records: [{ studentMemberId: "s1", status: "LATE" }],
        });
      }
      if (url === ATTENDANCE_EP.classStudents("c-1")) {
        return Promise.resolve(
          envelope([{ studentMemberId: "s1", displayName: "Nguyễn An" }]),
        );
      }
      throw new Error(`unexpected url ${url}`);
    });
    const repo = new AttendanceRepository(makeHttp({ get }), "u-1");

    const roster = await repo.getClassAttendance("c-1", "2026-06-07");

    expect(get).toHaveBeenCalledWith(ATTENDANCE_EP.classAttendance("c-1"), {
      params: { date: "2026-06-07" },
    });
    expect(roster.classDate).toEqual({ classId: "c-1", date: "2026-06-07" });
    expect(roster.records).toEqual([
      { studentId: "s1", studentName: "Nguyễn An", status: "late" },
    ]);
  });

  it("saveClassAttendance POSTs records mapped to wire status", async () => {
    const post = vi.fn().mockResolvedValue(null);
    const repo = new AttendanceRepository(makeHttp({ post }), "u-1");

    await repo.saveClassAttendance("c-1", "2026-06-07", [
      { studentId: "s1", studentName: "An", status: "excusedAbsent" },
    ]);

    expect(post).toHaveBeenCalledWith(ATTENDANCE_EP.classAttendance("c-1"), {
      date: "2026-06-07",
      records: [{ studentMemberId: "s1", status: "EXCUSED_ABSENT" }],
    });
  });

  it("getAttendanceHistory fans out per-day and aggregates counts", async () => {
    const get = vi.fn().mockImplementation((url: string, config?: unknown) => {
      if (url === ATTENDANCE_EP.classStudents("c-1")) {
        return Promise.resolve(
          envelope([
            { studentMemberId: "s1", displayName: "An" },
            { studentMemberId: "s2", displayName: "Bình" },
          ]),
        );
      }
      const date = (config as { params?: { date?: string } })?.params?.date;
      if (date === "2026-06-02") {
        return Promise.reject(
          new ApiError({
            code: "ATTENDANCE_NOT_FOUND",
            message: "n/a",
            retryable: false,
          }),
        );
      }
      return Promise.resolve({
        classId: "c-1",
        date,
        records: [
          { studentMemberId: "s1", status: "PRESENT" },
          { studentMemberId: "s2", status: "ABSENT" },
        ],
      });
    });
    const repo = new AttendanceRepository(makeHttp({ get }), "u-1");

    const history = await repo.getAttendanceHistory(
      "c-1",
      "2026-06-01",
      "2026-06-03",
    );

    expect(history).toHaveLength(3);
    expect(history[1]).toEqual({
      date: "2026-06-02",
      counts: { present: 0, absent: 0, late: 0, excusedAbsent: 0 },
      totalStudents: 2,
    });
    expect(history[0].counts).toEqual({
      present: 1,
      absent: 1,
      late: 0,
      excusedAbsent: 0,
    });
  });
});
