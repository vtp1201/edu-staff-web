import type { AxiosInstance } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { TimetableFailure } from "../../domain/failures/timetable.failure";
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
    expect(data.conflicts).toEqual([]);
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
      { day: "MON", period: 1, subjectId: "s-new", teacherMemberId: "t-new" },
    ]);
    // returns the updated cell as a domain slot (room non-persistent → "")
    expect(slot.slotKey).toBe("cls-1|0|1");
    expect(slot.subjectId).toBe("s-new");
    expect(slot.teacherId).toBe("t-new");
    expect(slot.room).toBe("");
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

describe("TimetableRepository — getConflicts (force-empty, no HTTP, ask #16)", () => {
  it("returns [] without touching the network", async () => {
    const http = makeHttp({});
    const repo = new TimetableRepository(http, resolveTermId);

    expect(await repo.getConflicts("cls-1", "2025-2026")).toEqual([]);
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
