import type { AxiosInstance } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { TimetableFailure } from "../../domain/failures/timetable.failure";
import type { TimetableConflictsResponseDto } from "../dtos/timetable-conflicts-response.dto";
import type { TimetableResponseDto } from "../dtos/timetable-slot-response.dto";
import { TimetableRepository } from "./timetable.repository";

const TERM_ID = "term-1";

function makeHttp(
  overrides: Partial<Record<"get" | "put" | "delete", unknown>>,
) {
  return {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  } as unknown as AxiosInstance & {
    get: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
}

const resolveTermId = vi.fn(async () => TERM_ID);

const CURRENT: TimetableResponseDto = {
  classId: "cls-1",
  termId: TERM_ID,
  slots: [
    { day: "MON", period: 1, subjectId: "s-old", teacherMemberId: "t-old" },
    { day: "TUE", period: 2, subjectId: "s-keep", teacherMemberId: "t-keep" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  resolveTermId.mockResolvedValue(TERM_ID);
});

describe("TimetableRepository — getTimetable (real GET)", () => {
  it("passes the resolved termId and maps the response", async () => {
    const http = makeHttp({ get: vi.fn(async () => CURRENT) });
    const repo = new TimetableRepository(http, resolveTermId);

    const data = await repo.getTimetable("cls-1", "2025-2026");

    expect(http.get).toHaveBeenCalledWith(
      "/core/api/v1/classes/cls-1/timetable",
      { params: { termId: TERM_ID } },
    );
    expect(data.classId).toBe("cls-1");
    expect(data.slots["cls-1|0|1"]?.subjectId).toBe("s-old");
  });
});

describe("TimetableRepository — updateSlot (read-modify-write PUT)", () => {
  it("GETs the current schedule, splices one cell, and PUTs the full body", async () => {
    const putResponse: TimetableResponseDto = {
      classId: "cls-1",
      termId: TERM_ID,
      slots: [
        {
          day: "TUE",
          period: 2,
          subjectId: "s-keep",
          teacherMemberId: "t-keep",
        },
        { day: "MON", period: 1, subjectId: "s-new", teacherMemberId: "t-new" },
      ],
    };
    const http = makeHttp({
      get: vi.fn(async () => CURRENT),
      put: vi.fn(async () => putResponse),
    });
    const repo = new TimetableRepository(http, resolveTermId);

    const slot = await repo.updateSlot("cls-1", "2025-2026", 0, 1, {
      subjectId: "s-new",
      teacherId: "t-new",
      room: "P.201",
    });

    // PUT carries the full slots array: the kept slot + the replaced cell.
    const [, body] = http.put.mock.calls[0];
    expect(body.termId).toBe(TERM_ID);
    expect(body.slots).toEqual([
      { day: "TUE", period: 2, subjectId: "s-keep", teacherMemberId: "t-keep" },
      {
        day: "MON",
        period: 1,
        subjectId: "s-new",
        teacherMemberId: "t-new",
        room: "P.201",
      },
    ]);
    // returns the updated cell as a domain slot
    expect(slot.slotKey).toBe("cls-1|0|1");
    expect(slot.subjectId).toBe("s-new");
    expect(slot.teacherId).toBe("t-new");
    expect(slot.room).toBe("");
  });

  it("persists room through the RMW PUT and reads it back (US-E18.26, ask #17)", async () => {
    const putResponse: TimetableResponseDto = {
      classId: "cls-1",
      termId: TERM_ID,
      slots: [
        {
          day: "TUE",
          period: 2,
          subjectId: "s-keep",
          teacherMemberId: "t-keep",
          room: "P.101",
        },
        {
          day: "MON",
          period: 1,
          subjectId: "s-new",
          teacherMemberId: "t-new",
          room: "P.201",
        },
      ],
    };
    const http = makeHttp({
      get: vi.fn(async () => ({
        ...CURRENT,
        slots: [
          {
            day: "TUE" as const,
            period: 2,
            subjectId: "s-keep",
            teacherMemberId: "t-keep",
            room: "P.101",
          },
        ],
      })),
      put: vi.fn(async () => putResponse),
    });
    const repo = new TimetableRepository(http, resolveTermId);

    const slot = await repo.updateSlot("cls-1", "2025-2026", 0, 1, {
      subjectId: "s-new",
      teacherId: "t-new",
      room: "P.201",
    });

    const [, body] = http.put.mock.calls[0];
    // The edited cell carries its new room…
    expect(body.slots).toContainEqual({
      day: "MON",
      period: 1,
      subjectId: "s-new",
      teacherMemberId: "t-new",
      room: "P.201",
    });
    // …and untouched slots do not lose theirs in the read-modify-write.
    expect(body.slots).toContainEqual({
      day: "TUE",
      period: 2,
      subjectId: "s-keep",
      teacherMemberId: "t-keep",
      room: "P.101",
    });
    expect(slot.room).toBe("P.201");
  });

  it("omits room from the PUT body when the editor left it blank", async () => {
    const http = makeHttp({
      get: vi.fn(async () => CURRENT),
      put: vi.fn(async () => CURRENT),
    });
    const repo = new TimetableRepository(http, resolveTermId);

    await repo.updateSlot("cls-1", "2025-2026", 0, 1, {
      subjectId: "s-new",
      teacherId: "t-new",
      room: "",
    });

    const [, body] = http.put.mock.calls[0];
    for (const s of body.slots) expect(s.room).toBeUndefined();
  });

  it("maps a 409 TIMETABLE_TEACHER_CONFLICT to the teacher-conflict failure", async () => {
    const http = makeHttp({
      get: vi.fn(async () => CURRENT),
      put: vi.fn(async () => {
        throw new ApiError({
          code: "TIMETABLE_TEACHER_CONFLICT",
          message: "double booked",
          retryable: false,
          status: 409,
        });
      }),
    });
    const repo = new TimetableRepository(http, resolveTermId);

    await expect(
      repo.updateSlot("cls-1", "2025-2026", 0, 1, {
        subjectId: "s",
        teacherId: "t",
        room: "",
      }),
    ).rejects.toEqual({
      type: "teacher-conflict",
      message: expect.any(String),
    } satisfies TimetableFailure);
  });

  it("maps a Saturday write (index 5) to invalid-day (no wire enum)", async () => {
    const http = makeHttp({ get: vi.fn(async () => CURRENT) });
    const repo = new TimetableRepository(http, resolveTermId);

    await expect(
      repo.updateSlot("cls-1", "2025-2026", 5, 1, {
        subjectId: "s",
        teacherId: "t",
        room: "",
      }),
    ).rejects.toMatchObject({ type: "invalid-day" });
    expect(http.put).not.toHaveBeenCalled();
  });
});

describe("TimetableRepository — clearSlot (real DELETE)", () => {
  it("DELETEs with termId/day/period query params", async () => {
    const http = makeHttp({ delete: vi.fn(async () => undefined) });
    const repo = new TimetableRepository(http, resolveTermId);

    await repo.clearSlot("cls-1", "2025-2026", 2, 3);

    expect(http.delete).toHaveBeenCalledWith(
      "/core/api/v1/classes/cls-1/timetable/slots",
      { params: { termId: TERM_ID, day: "WED", period: 3 } },
    );
  });

  it("maps 404 TIMETABLE_SLOT_NOT_FOUND to slot-not-found", async () => {
    const http = makeHttp({
      delete: vi.fn(async () => {
        throw new ApiError({
          code: "TIMETABLE_SLOT_NOT_FOUND",
          message: "gone",
          retryable: false,
          status: 404,
        });
      }),
    });
    const repo = new TimetableRepository(http, resolveTermId);

    await expect(
      repo.clearSlot("cls-1", "2025-2026", 0, 1),
    ).rejects.toMatchObject({ type: "slot-not-found" });
  });
});

describe("TimetableRepository — getConflicts (real whole-school scan, BE US-188)", () => {
  const SCAN_DTO: TimetableConflictsResponseDto = {
    termId: TERM_ID,
    truncated: false,
    conflicts: [
      {
        type: "ROOM_DOUBLE_BOOKED",
        day: "MON",
        period: 1,
        classes: [
          { classId: "cls-1", subjectId: "sub-1" },
          { classId: "cls-2", subjectId: "sub-2" },
        ],
        room: "P.201",
      },
      {
        type: "TEACHER_DOUBLE_BOOKED",
        day: "WED",
        period: 4,
        classes: [
          { classId: "cls-1", subjectId: "sub-3" },
          { classId: "cls-3", subjectId: "sub-3" },
        ],
        teacherMemberId: "member-9",
      },
    ],
  };

  it("GETs the FLAT tenant-wide path with only the resolved termId (no classId)", async () => {
    const http = makeHttp({ get: vi.fn(async () => SCAN_DTO) });
    const repo = new TimetableRepository(http, resolveTermId);

    await repo.getConflicts();

    expect(http.get).toHaveBeenCalledWith("/core/api/v1/timetable/conflicts", {
      params: { termId: TERM_ID },
    });
    // The path must NOT be nested under /classes/... (a real contract detail:
    // the scan is whole-tenant, the tenant comes from the token claim).
    expect(http.get.mock.calls[0][0]).not.toContain("/classes/");
  });

  it("maps both conflict kinds onto the domain's stable keys", async () => {
    const http = makeHttp({ get: vi.fn(async () => SCAN_DTO) });
    const repo = new TimetableRepository(http, resolveTermId);

    const scan = await repo.getConflicts();

    expect(scan.termId).toBe(TERM_ID);
    expect(scan.conflicts).toEqual([
      {
        type: "room-double-booked",
        day: 0,
        period: 1,
        classes: [
          { classId: "cls-1", subjectId: "sub-1" },
          { classId: "cls-2", subjectId: "sub-2" },
        ],
        room: "P.201",
      },
      {
        type: "teacher-double-booked",
        day: 2,
        period: 4,
        classes: [
          { classId: "cls-1", subjectId: "sub-3" },
          { classId: "cls-3", subjectId: "sub-3" },
        ],
        teacherId: "member-9",
      },
    ]);
  });

  it("passes `truncated: true` through — a bounded scan is not a failure", async () => {
    const http = makeHttp({
      get: vi.fn(async () => ({ ...SCAN_DTO, truncated: true })),
    });
    const repo = new TimetableRepository(http, resolveTermId);

    await expect(repo.getConflicts()).resolves.toMatchObject({
      truncated: true,
    });
  });

  it("returns an empty scan for an unknown termId (BE answers 200 + [], not 404)", async () => {
    const http = makeHttp({
      get: vi.fn(async () => ({
        termId: "unknown",
        truncated: false,
        conflicts: [],
      })),
    });
    const repo = new TimetableRepository(http, resolveTermId);

    await expect(repo.getConflicts()).resolves.toEqual({
      termId: "unknown",
      truncated: false,
      conflicts: [],
    });
  });

  it("maps a 403 TIMETABLE_FORBIDDEN to the forbidden failure (MANAGER is not authorized)", async () => {
    const http = makeHttp({
      get: vi.fn(async () => {
        throw new ApiError({
          code: "TIMETABLE_FORBIDDEN",
          message: "admin only",
          retryable: false,
          status: 403,
        });
      }),
    });
    const repo = new TimetableRepository(http, resolveTermId);

    await expect(repo.getConflicts()).rejects.toMatchObject({
      type: "forbidden",
    });
  });

  it("surfaces an unresolvable term as invalid-term without calling the endpoint", async () => {
    const http = makeHttp({ get: vi.fn() });
    resolveTermId.mockRejectedValueOnce({
      type: "invalid-term",
      message: "No academic term covers this date",
    });
    const repo = new TimetableRepository(http, resolveTermId);

    await expect(repo.getConflicts()).rejects.toMatchObject({
      type: "invalid-term",
    });
    expect(http.get).not.toHaveBeenCalled();
  });
});

describe("TimetableRepository — full error-code matrix", () => {
  const CASES: Array<[string, TimetableFailure["type"]]> = [
    ["TIMETABLE_INVALID_TENANT_ID", "invalid-tenant"],
    ["TIMETABLE_INVALID_CLASS_ID", "invalid-class"],
    ["TIMETABLE_INVALID_TERM_ID", "invalid-term"],
    ["TIMETABLE_INVALID_MEMBER_ID", "invalid-member"],
    ["TIMETABLE_INVALID_SUBJECT_ID", "invalid-subject"],
    ["TIMETABLE_INVALID_SLOT_ID", "invalid-slot"],
    ["TIMETABLE_INVALID_DAY", "invalid-day"],
    ["TIMETABLE_INVALID_PERIOD", "invalid-period"],
    ["TIMETABLE_FORBIDDEN", "forbidden"],
    ["TIMETABLE_SLOT_NOT_FOUND", "slot-not-found"],
    ["TIMETABLE_TEACHER_CONFLICT", "teacher-conflict"],
    ["SOMETHING_UNMAPPED", "fetch-failed"],
  ];

  it.each(CASES)("maps %s → %s", async (code, type) => {
    const http = makeHttp({
      get: vi.fn(async () => {
        throw new ApiError({ code, message: code, retryable: false });
      }),
    });
    const repo = new TimetableRepository(http, resolveTermId);
    await expect(repo.getTimetable("cls-1", "y")).rejects.toMatchObject({
      type,
    });
  });
});
