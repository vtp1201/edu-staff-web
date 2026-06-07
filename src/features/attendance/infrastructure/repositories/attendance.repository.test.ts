import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ATTENDANCE_EP } from "@/bootstrap/endpoint/attendance.endpoint";
import { AttendanceRepository } from "./attendance.repository";

// Post-US-E06.1: the http interceptor unwraps the BE envelope, so the repo
// receives the payload directly. These tests mock at that boundary (payload in,
// domain entity out) — the repo must NOT re-read `.data`.
function makeHttp(over: Partial<AxiosInstance> = {}) {
  return {
    get: vi.fn(),
    put: vi.fn(),
    ...over,
  } as unknown as AxiosInstance;
}

describe("AttendanceRepository", () => {
  it("maps the classes payload to ClassSummary[]", async () => {
    const http = makeHttp({
      get: vi.fn().mockResolvedValue([
        { id: "c-1", name: "10A1" },
        { id: "c-2", name: "10A2" },
      ]),
    });
    const repo = new AttendanceRepository(http);

    const classes = await repo.listMyClasses();

    expect(http.get).toHaveBeenCalledWith(ATTENDANCE_EP.myClasses);
    expect(classes).toEqual([
      { id: "c-1", name: "10A1" },
      { id: "c-2", name: "10A2" },
    ]);
  });

  it("maps the roster payload to a domain roster", async () => {
    const payload = {
      period: {
        id: "p-1",
        classId: "c-1",
        className: "10A1",
        subject: "Toán",
        date: "2026-06-07",
        period: 2,
      },
      records: [
        {
          studentId: "s1",
          studentName: "An",
          studentCode: "HS001",
          status: "present",
        },
      ],
    };
    const http = makeHttp({ get: vi.fn().mockResolvedValue(payload) });
    const repo = new AttendanceRepository(http);

    const roster = await repo.getRoster("c-1", "2026-06-07", 2);

    expect(http.get).toHaveBeenCalledWith(ATTENDANCE_EP.roster("c-1"), {
      params: { date: "2026-06-07", period: 2 },
    });
    expect(roster.period.className).toBe("10A1");
    expect(roster.records).toHaveLength(1);
    expect(roster.records[0].studentId).toBe("s1");
  });

  it("PUTs records to the period endpoint on save", async () => {
    const http = makeHttp({ put: vi.fn().mockResolvedValue(null) });
    const repo = new AttendanceRepository(http);
    const records = [
      {
        studentId: "s1",
        studentName: "An",
        studentCode: "HS001",
        status: "present" as const,
      },
    ];

    await repo.saveAttendance("p-1", records);

    expect(http.put).toHaveBeenCalledWith(ATTENDANCE_EP.save("p-1"), {
      records,
    });
  });
});
