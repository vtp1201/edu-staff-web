import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ATTENDANCE_EP } from "@/bootstrap/endpoint/attendance.endpoint";
import type { ApiEnvelope } from "@/bootstrap/lib/api-envelope";
import { ApiError, unwrapResponse } from "@/bootstrap/lib/api-envelope";
import type { AttendanceFailure } from "../../domain/failures/attendance.failure";
import { toAttendanceFailure } from "../mappers/attendance-failure.mapper";
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

  describe("getAttendanceHistory (US-E18.47 — single range call)", () => {
    /** Range-mode GET + the (unrelated, still needed) roster drain. */
    function rangeHttp(
      records: Array<{
        date: string;
        studentMemberId: string;
        status: string;
      }>,
    ) {
      const get = vi.fn().mockImplementation((url: string) => {
        if (url === ATTENDANCE_EP.classStudents("c-1")) {
          return Promise.resolve(
            envelope([
              { studentMemberId: "s1", displayName: "An" },
              { studentMemberId: "s2", displayName: "Bình" },
            ]),
          );
        }
        if (url === ATTENDANCE_EP.classAttendance("c-1")) {
          return Promise.resolve({ classId: "c-1", records });
        }
        throw new Error(`unexpected url ${url}`);
      });
      return get;
    }

    const attendanceCalls = (get: ReturnType<typeof vi.fn>) =>
      get.mock.calls.filter(
        ([url]) => url === ATTENDANCE_EP.classAttendance("c-1"),
      );

    it("costs exactly ONE attendance HTTP call for a 31-day window (was one per day)", async () => {
      const get = rangeHttp([]);
      const repo = new AttendanceRepository(makeHttp({ get }), "u-1");

      await repo.getAttendanceHistory("c-1", "2026-06-01", "2026-07-01");

      expect(attendanceCalls(get)).toHaveLength(1);
      expect(get).toHaveBeenCalledWith(ATTENDANCE_EP.classAttendance("c-1"), {
        params: { startDate: "2026-06-01", endDate: "2026-07-01" },
      });
    });

    it("never sends `date` alongside the range bounds (BE 400 ATTENDANCE_INVALID_DATE — ambiguous mode)", async () => {
      const get = rangeHttp([]);
      const repo = new AttendanceRepository(makeHttp({ get }), "u-1");

      await repo.getAttendanceHistory("c-1", "2026-06-01", "2026-06-03");

      const [, config] = attendanceCalls(get)[0];
      expect(
        (config as { params: Record<string, unknown> }).params,
      ).not.toHaveProperty("date");
    });

    it("aggregates the flat range records into one summary per requested day", async () => {
      const get = rangeHttp([
        { date: "2026-06-01", studentMemberId: "s1", status: "PRESENT" },
        { date: "2026-06-01", studentMemberId: "s2", status: "ABSENT" },
        { date: "2026-06-03", studentMemberId: "s1", status: "LATE" },
      ]);
      const repo = new AttendanceRepository(makeHttp({ get }), "u-1");

      const history = await repo.getAttendanceHistory(
        "c-1",
        "2026-06-01",
        "2026-06-03",
      );

      expect(history).toHaveLength(3);
      expect(history[0]).toEqual({
        date: "2026-06-01",
        counts: { present: 1, absent: 1, late: 0, excusedAbsent: 0 },
        totalStudents: 2,
      });
      // A day with no record at all is still a zero-count day, exactly as the
      // old per-day fan-out reported an empty/ATTENDANCE_NOT_FOUND day.
      expect(history[1]).toEqual({
        date: "2026-06-02",
        counts: { present: 0, absent: 0, late: 0, excusedAbsent: 0 },
        totalStudents: 2,
      });
      expect(history[2].counts.late).toBe(1);
    });

    it("returns all-zero days (never throws) when the range has no records at all", async () => {
      const get = rangeHttp([]);
      const repo = new AttendanceRepository(makeHttp({ get }), "u-1");

      const history = await repo.getAttendanceHistory(
        "c-1",
        "2026-06-01",
        "2026-06-02",
      );

      expect(history.map((h) => h.date)).toEqual(["2026-06-01", "2026-06-02"]);
    });
  });

  describe("getAttendanceHistory — range error-code mapping", () => {
    const cases: Array<[string, number, AttendanceFailure["type"]]> = [
      ["ATTENDANCE_INVALID_DATE_RANGE", 400, "invalid-request"],
      ["ATTENDANCE_DATE_RANGE_TOO_LARGE", 400, "invalid-request"],
      ["ATTENDANCE_INVALID_DATE", 400, "invalid-request"],
      ["ATTENDANCE_FORBIDDEN", 403, "forbidden"],
      ["ATTENDANCE_INVALID_CLASS_ID", 400, "invalid-request"],
    ];

    for (const [code, status, expected] of cases) {
      it(`${code} → ${expected}`, async () => {
        const get = vi.fn().mockImplementation((url: string) => {
          if (url === ATTENDANCE_EP.classStudents("c-1")) {
            return Promise.resolve(envelope([]));
          }
          return Promise.reject(
            new ApiError({ code, message: "n/a", retryable: false, status }),
          );
        });
        const repo = new AttendanceRepository(makeHttp({ get }), "u-1");

        await expect(
          repo.getAttendanceHistory("c-1", "2026-06-01", "2026-06-03"),
        ).rejects.toBeInstanceOf(ApiError);
        try {
          await repo.getAttendanceHistory("c-1", "2026-06-01", "2026-06-03");
        } catch (err) {
          expect(toAttendanceFailure(err).type).toBe(expected);
        }
      });
    }
  });
});

/**
 * Guard: the history range call must survive the REAL success interceptor.
 * `getAttendanceHistory`'s range GET is a plain (non-`raw`) call, so the
 * interceptor unwraps the envelope and the repo must read the payload
 * directly — not `.data`.
 */
describe("AttendanceRepository — real interceptor pipeline", () => {
  it("getAttendanceHistory reads the unwrapped range payload", async () => {
    const get = vi.fn(
      async (url: string, config?: { params?: unknown; raw?: boolean }) =>
        unwrapResponse({
          data:
            url === ATTENDANCE_EP.classStudents("c-1")
              ? envelope([{ studentMemberId: "s1", displayName: "An" }])
              : envelope({
                  classId: "c-1",
                  records: [
                    {
                      date: "2026-06-01",
                      studentMemberId: "s1",
                      status: "PRESENT",
                    },
                  ],
                }),
          config: { url, raw: config?.raw },
        }),
    ) as unknown as AxiosInstance["get"];
    const repo = new AttendanceRepository(makeHttp({ get }), "u-1");

    const history = await repo.getAttendanceHistory(
      "c-1",
      "2026-06-01",
      "2026-06-01",
    );

    expect(history).toEqual([
      {
        date: "2026-06-01",
        counts: { present: 1, absent: 0, late: 0, excusedAbsent: 0 },
        totalStudents: 1,
      },
    ]);
  });
});
