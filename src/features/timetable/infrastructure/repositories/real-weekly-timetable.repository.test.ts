/**
 * Integration tests — RealWeeklyTimetableRepository + HybridWeeklyTimetableRepository
 * (US-E18.11). `getByTeacher` fan-out mirrors `teacher-class.repository.ts`'s
 * `fetchAllPages` (`raw: true` MUST stay a top-level axios-config sibling of
 * `params` — epic-wide recurring bug, US-E18.19); mocked as the full
 * `ApiEnvelope<T>` shape so `parseEnvelope()` runs for real.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { RealTimetableResponseDto } from "../dtos/real-timetable-response.dto";
import {
  HybridWeeklyTimetableRepository,
  RealWeeklyTimetableRepository,
} from "./real-weekly-timetable.repository";

const TERM_ID = "term-1";
const resolveTermId = vi.fn(async () => TERM_ID);

function listEnvelope<T>(items: T[], nextCursor: string | null = null) {
  return {
    success: true,
    data: items,
    error: null,
    meta: {
      requestId: "req-test",
      pagination: { nextCursor, hasMore: nextCursor != null },
    },
  };
}

function makeHttp(overrides: Partial<Record<"get", unknown>> = {}) {
  return { get: vi.fn(), ...overrides } as unknown as AxiosInstance & {
    get: ReturnType<typeof vi.fn>;
  };
}

describe("RealWeeklyTimetableRepository — getByClass (real GET)", () => {
  it("resolves the term then GETs the class-scoped timetable", async () => {
    const dto: RealTimetableResponseDto = {
      classId: "cls-1",
      termId: TERM_ID,
      slots: [
        { day: "MON", period: 1, subjectId: "s1", teacherMemberId: "t1" },
      ],
    };
    const http = makeHttp({ get: vi.fn(async () => dto) });
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    const vm = await repo.getByClass("cls-1");

    expect(http.get).toHaveBeenCalledWith(
      "/core/api/v1/classes/cls-1/timetable",
      { params: { termId: TERM_ID } },
    );
    expect(vm.classId).toBe("cls-1");
    expect(vm.slots[0]?.[1]?.subjectId).toBe("s1");
  });

  it("maps TIMETABLE_FORBIDDEN to not-found (403 = 'no access', drives the empty state)", async () => {
    const http = makeHttp({
      get: vi.fn(async () => {
        throw new ApiError({
          code: "TIMETABLE_FORBIDDEN",
          message: "forbidden",
          retryable: false,
          status: 403,
        });
      }),
    });
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    await expect(repo.getByClass("cls-1")).rejects.toMatchObject({
      type: "not-found",
    });
  });
});

describe("RealWeeklyTimetableRepository — getByTeacher (GET /classes fan-out + merge)", () => {
  it("fetches assigned classes, merges only this teacher's slots, tags className", async () => {
    const get = vi.fn();
    get.mockImplementation((url: string) => {
      if (url === "/core/api/v1/classes") {
        return Promise.resolve(
          listEnvelope([
            { classId: "cls-a", name: "11A2" },
            { classId: "cls-b", name: "8B1" },
          ]),
        );
      }
      if (url === "/core/api/v1/classes/cls-a/timetable") {
        return Promise.resolve({
          classId: "cls-a",
          termId: TERM_ID,
          slots: [
            { day: "MON", period: 1, subjectId: "s1", teacherMemberId: "me" },
            {
              day: "MON",
              period: 2,
              subjectId: "s2",
              teacherMemberId: "other",
            },
          ],
        } satisfies RealTimetableResponseDto);
      }
      if (url === "/core/api/v1/classes/cls-b/timetable") {
        return Promise.resolve({
          classId: "cls-b",
          termId: TERM_ID,
          slots: [
            { day: "TUE", period: 3, subjectId: "s3", teacherMemberId: "me" },
          ],
        } satisfies RealTimetableResponseDto);
      }
      throw new Error(`unexpected url ${url}`);
    });
    const http = makeHttp({ get });
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    const vm = await repo.getByTeacher();

    // Own slot kept, tagged with the class name.
    expect(vm.slots[0]?.[1]?.className).toBe("11A2");
    // Another teacher's slot in the same class is filtered out.
    expect(vm.slots[0]?.[2]).toBeUndefined();
    // Slot in the second assigned class also merged in.
    expect(vm.slots[1]?.[3]?.className).toBe("8B1");
  });

  it("passes raw:true as a top-level axios-config sibling of params (US-E18.19 regression guard)", async () => {
    const get = vi.fn(
      async (
        _url: string,
        _config?: { params?: Record<string, unknown>; raw?: boolean },
      ) => listEnvelope([]),
    );
    const http = makeHttp({ get });
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    await expect(repo.getByTeacher()).rejects.toMatchObject({
      type: "not-found",
    });

    const [, config] = get.mock.calls[0];
    expect(config?.raw).toBe(true);
    expect(config?.params).not.toHaveProperty("raw");
  });

  it("maps a transport failure to not-found when the fan-out list is empty", async () => {
    const http = makeHttp({ get: vi.fn(async () => listEnvelope([])) });
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    await expect(repo.getByTeacher()).rejects.toMatchObject({
      type: "not-found",
    });
  });
});

describe("RealWeeklyTimetableRepository — force-blocked operations (ask #15)", () => {
  it("getMyTimetable throws unconditionally without touching HTTP", async () => {
    const http = makeHttp({});
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");
    await expect(repo.getMyTimetable()).rejects.toThrow();
    expect(http.get).not.toHaveBeenCalled();
  });

  it("getChildren throws unconditionally without touching HTTP", async () => {
    const http = makeHttp({});
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");
    await expect(repo.getChildren()).rejects.toThrow();
    expect(http.get).not.toHaveBeenCalled();
  });
});

describe("HybridWeeklyTimetableRepository", () => {
  it("routes getByTeacher to the real repo and everything else to mock", async () => {
    const real = {
      getByClass: vi.fn(),
      getByTeacher: vi.fn(async () => ({
        classId: "me",
        className: "",
        slots: {},
      })),
      getMyTimetable: vi.fn(),
      getChildren: vi.fn(),
    };
    const mock = {
      getByClass: vi.fn(async () => ({
        classId: "mock-cls",
        className: "x",
        slots: {},
      })),
      getByTeacher: vi.fn(),
      getMyTimetable: vi.fn(async () => ({
        classId: "mock-me",
        className: "",
        slots: {},
      })),
      getChildren: vi.fn(async () => []),
    };
    const hybrid = new HybridWeeklyTimetableRepository(real, mock);

    await hybrid.getByTeacher();
    expect(real.getByTeacher).toHaveBeenCalled();
    expect(mock.getByTeacher).not.toHaveBeenCalled();

    await hybrid.getByClass("11A2");
    expect(mock.getByClass).toHaveBeenCalledWith("11A2", undefined);
    expect(real.getByClass).not.toHaveBeenCalled();

    await hybrid.getMyTimetable();
    expect(mock.getMyTimetable).toHaveBeenCalled();

    await hybrid.getChildren();
    expect(mock.getChildren).toHaveBeenCalled();
  });
});
