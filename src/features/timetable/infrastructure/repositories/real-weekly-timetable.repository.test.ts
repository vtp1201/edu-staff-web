/**
 * Integration tests — RealWeeklyTimetableRepository + HybridWeeklyTimetableRepository
 * (US-E18.11, extended by US-E18.26). The `GET /classes` lookup still uses
 * `fetchAllPages` (`raw: true` MUST stay a top-level axios-config sibling of
 * `params` — epic-wide recurring bug, US-E18.19); mocked as the full
 * `ApiEnvelope<T>` shape so `parseEnvelope()` runs for real.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { LinkedStudentsResponseDto } from "../dtos/linked-student-item.dto";
import type { MemberEnrollmentResponseDto } from "../dtos/member-enrollment-response.dto";
import type { MemberTimetableResponseDto } from "../dtos/member-timetable-response.dto";
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

function apiError(code: string, status: number) {
  return new ApiError({ code, message: code, retryable: false, status });
}

function makeHttp(overrides: Partial<Record<"get", unknown>> = {}) {
  return { get: vi.fn(), ...overrides } as unknown as AxiosInstance & {
    get: ReturnType<typeof vi.fn>;
  };
}

const MEMBER_DTO: MemberTimetableResponseDto = {
  memberId: "me",
  termId: TERM_ID,
  slots: [
    {
      classId: "cls-a",
      day: "MON",
      period: 1,
      subjectId: "sub-1",
      subjectName: "Toán",
      teacherMemberId: "me",
      room: "P.201",
    },
    {
      classId: "cls-b",
      day: "TUE",
      period: 3,
      subjectId: "sub-2",
      teacherMemberId: "me",
    },
  ],
};

const ENROLLMENT_DTO: MemberEnrollmentResponseDto = {
  classId: "cls-a",
  className: "11A2",
  gradeLevel: 11,
  academicYearLabel: "2025-2026",
  enrolledAt: "2025-09-05T00:00:00Z",
};

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
        throw apiError("TIMETABLE_FORBIDDEN", 403);
      }),
    });
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    await expect(repo.getByClass("cls-1")).rejects.toMatchObject({
      type: "not-found",
    });
  });
});

describe("RealWeeklyTimetableRepository — getByMember (US-E18.26)", () => {
  it("GETs /members/{id}/timetable with the resolved termId and maps the week", async () => {
    const http = makeHttp({ get: vi.fn(async () => MEMBER_DTO) });
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    const vm = await repo.getByMember("child-1");

    expect(http.get).toHaveBeenCalledWith(
      "/core/api/v1/members/child-1/timetable",
      { params: { termId: TERM_ID } },
    );
    expect(vm.classId).toBe("child-1");
    expect(vm.slots[0]?.[1]?.subjectName).toBe("Toán");
    expect(vm.slots[0]?.[1]?.room).toBe("P.201");
    expect(vm.slots[1]?.[3]?.subjectName).toBe("sub-2"); // id fallback
  });

  it("percent-encodes the memberId in the path", async () => {
    const http = makeHttp({ get: vi.fn(async () => MEMBER_DTO) });
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    await repo.getByMember("a/b");

    expect(http.get).toHaveBeenCalledWith(
      "/core/api/v1/members/a%2Fb/timetable",
      { params: { termId: TERM_ID } },
    );
  });

  it("resolves the term from weekStart when given", async () => {
    const http = makeHttp({ get: vi.fn(async () => MEMBER_DTO) });
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    await repo.getByMember("child-1", "2026-03-02");

    expect(resolveTermId).toHaveBeenLastCalledWith(new Date("2026-03-02"));
  });

  it.each([
    ["TIMETABLE_MEMBER_NOT_RESOLVABLE", 404, "not-found"],
    ["TIMETABLE_FORBIDDEN", 403, "not-found"],
    ["TIMETABLE_CHILD_AMBIGUOUS", 422, "network-error"],
    ["TIMETABLE_INVALID_TERM_ID", 400, "network-error"],
  ])("maps %s → %s", async (code, status, type) => {
    const http = makeHttp({
      get: vi.fn(async () => {
        throw apiError(code, status);
      }),
    });
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    await expect(repo.getByMember("child-1")).rejects.toMatchObject({ type });
  });
});

describe("RealWeeklyTimetableRepository — getMyTimetable (student self-view)", () => {
  function studentHttp(enrollment: () => unknown) {
    const get = vi.fn(async (url: string) => {
      if (url === "/core/api/v1/members/me/timetable") return MEMBER_DTO;
      if (url === "/core/api/v1/members/me/enrollment") return enrollment();
      throw new Error(`unexpected url ${url}`);
    });
    return makeHttp({ get });
  }

  it("composes the by-member week with the enrollment call for class metadata", async () => {
    const http = studentHttp(() => ENROLLMENT_DTO);
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    const vm = await repo.getMyTimetable();

    expect(http.get).toHaveBeenCalledWith("/core/api/v1/members/me/enrollment");
    expect(vm.classId).toBe("cls-a");
    expect(vm.className).toBe("11A2");
    // Per-slot className resolves only for the enrolled class.
    expect(vm.slots[0]?.[1]?.className).toBe("11A2");
    expect(vm.slots[1]?.[3]?.className).toBeUndefined();
  });

  it.each([
    ["ROSTER_STUDENT_NOT_ENROLLED", 404],
    ["ROSTER_ACCESS_FORBIDDEN", 403],
  ])("degrades to empty class metadata when the enrollment call fails with %s (does not fail the screen)", async (code, status) => {
    const http = studentHttp(() => {
      throw apiError(code, status);
    });
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    const vm = await repo.getMyTimetable();

    expect(vm.className).toBe("");
    expect(vm.classId).toBe("me");
    expect(vm.slots[0]?.[1]?.subjectName).toBe("Toán");
  });

  it("degrades the same way for any other enrollment-call failure", async () => {
    const http = studentHttp(() => {
      throw new Error("boom");
    });
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    const vm = await repo.getMyTimetable();
    expect(vm.className).toBe("");
  });

  it("still propagates a failure of the PRIMARY timetable call", async () => {
    const http = makeHttp({
      get: vi.fn(async (url: string) => {
        if (url === "/core/api/v1/members/me/timetable") {
          throw apiError("TIMETABLE_MEMBER_NOT_RESOLVABLE", 404);
        }
        return ENROLLMENT_DTO;
      }),
    });
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    await expect(repo.getMyTimetable()).rejects.toMatchObject({
      type: "not-found",
    });
  });

  it("fails with not-found when no member id could be decoded from the token", async () => {
    const http = makeHttp({});
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, null);

    await expect(repo.getMyTimetable()).rejects.toMatchObject({
      type: "not-found",
    });
    expect(http.get).not.toHaveBeenCalled();
  });
});

describe("RealWeeklyTimetableRepository — getByTeacher (by-member + classes lookup)", () => {
  function teacherHttp() {
    const get = vi.fn((url: string) => {
      if (url === "/core/api/v1/classes") {
        return Promise.resolve(
          listEnvelope([
            { classId: "cls-a", name: "11A2" },
            { classId: "cls-b", name: "8B1" },
          ]),
        );
      }
      if (url === "/core/api/v1/members/me/timetable") {
        return Promise.resolve(MEMBER_DTO);
      }
      throw new Error(`unexpected url ${url}`);
    });
    return makeHttp({ get });
  }

  it("makes exactly TWO calls regardless of class count (no 1+N fan-out)", async () => {
    const http = teacherHttp();
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    await repo.getByTeacher();

    expect(http.get).toHaveBeenCalledTimes(2);
    // Issued concurrently — assert the SET, not the order.
    expect(http.get.mock.calls.map(([url]) => url).sort()).toEqual([
      "/core/api/v1/classes",
      "/core/api/v1/members/me/timetable",
    ]);
  });

  it("tags every slot's className from the classId → className lookup", async () => {
    const http = teacherHttp();
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    const vm = await repo.getByTeacher();

    expect(vm.slots[0]?.[1]?.className).toBe("11A2");
    expect(vm.slots[1]?.[3]?.className).toBe("8B1");
  });

  it("resolves teacher display names in one batched lookup", async () => {
    const http = teacherHttp();
    const resolveNames = vi
      .fn()
      .mockResolvedValue(new Map([["me", "Cô Nguyễn Thị Hương"]]));
    const repo = new RealWeeklyTimetableRepository(
      http,
      resolveTermId,
      "me",
      resolveNames,
    );

    const vm = await repo.getByTeacher();

    // one call, deduped ids — not one lookup per slot
    expect(resolveNames).toHaveBeenCalledTimes(1);
    expect(resolveNames).toHaveBeenCalledWith(["me"]);
    expect(vm.slots[0]?.[1]?.teacherName).toBe("Cô Nguyễn Thị Hương");
  });

  it("keeps the raw member id when the name lookup fails", async () => {
    const http = teacherHttp();
    const repo = new RealWeeklyTimetableRepository(
      http,
      resolveTermId,
      "me",
      async () => {
        throw new Error("iam down");
      },
    );

    const vm = await repo.getByTeacher();

    expect(vm.slots[0]?.[1]?.teacherName).toBe("me");
  });

  it("passes raw:true as a top-level axios-config sibling of params (US-E18.19 regression guard)", async () => {
    const http = teacherHttp();
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    await repo.getByTeacher();

    const classesCall = http.get.mock.calls.find(
      ([url]) => url === "/core/api/v1/classes",
    );
    const config = classesCall?.[1] as {
      params?: Record<string, unknown>;
      raw?: boolean;
    };
    expect(config.raw).toBe(true);
    expect(config.params).not.toHaveProperty("raw");
  });

  it("maps TIMETABLE_MEMBER_NOT_RESOLVABLE to not-found (teacher has no schedule)", async () => {
    const http = makeHttp({
      get: vi.fn(async () => {
        throw apiError("TIMETABLE_MEMBER_NOT_RESOLVABLE", 404);
      }),
    });
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    await expect(repo.getByTeacher()).rejects.toMatchObject({
      type: "not-found",
    });
  });

  it("fails with not-found when no member id could be decoded from the token", async () => {
    const http = makeHttp({});
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, null);

    await expect(repo.getByTeacher()).rejects.toMatchObject({
      type: "not-found",
    });
    expect(http.get).not.toHaveBeenCalled();
  });
});

describe("RealWeeklyTimetableRepository — getChildren (linked-students)", () => {
  const LINKS: LinkedStudentsResponseDto = {
    links: [
      {
        linkId: "link-b",
        parentMemberId: "me",
        studentMemberId: "stu-b",
        createdAt: "2026-01-02T00:00:00Z",
      },
      {
        linkId: "link-a",
        parentMemberId: "me",
        studentMemberId: "stu-a",
        createdAt: "2026-01-01T00:00:00Z",
        classId: "cls-a",
        className: "10A1",
      },
    ],
  };

  it("GETs the parent's own linked-students and unwraps `links`", async () => {
    const http = makeHttp({ get: vi.fn(async () => LINKS) });
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    const children = await repo.getChildren();

    expect(http.get).toHaveBeenCalledWith(
      "/core/api/v1/members/me/linked-students",
    );
    expect(children.map((c) => c.childId)).toEqual(["stu-a", "stu-b"]);
    expect(children[0]?.className).toBe("10A1");
    expect(children[1]?.className).toBeUndefined();
    expect(children[0]?.ordinal).toBe(1);
  });

  it("sends no pagination params — `linked-students` is a flat `{links}` object, not cursor-paginated (openapi.yaml LinkedStudentsResponse)", async () => {
    const get = vi.fn(async () => LINKS);
    const http = makeHttp({ get });
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    await repo.getChildren();

    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0]).toHaveLength(1); // no axios config at all
  });

  it("tolerates a missing `links` array", async () => {
    const http = makeHttp({ get: vi.fn(async () => ({})) });
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    await expect(repo.getChildren()).resolves.toEqual([]);
  });

  it("maps PARENTLINK_FORBIDDEN to no-child (BE's don't-reveal posture)", async () => {
    const http = makeHttp({
      get: vi.fn(async () => {
        throw apiError("PARENTLINK_FORBIDDEN", 403);
      }),
    });
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    await expect(repo.getChildren()).rejects.toMatchObject({
      type: "no-child",
    });
  });

  it("maps a transport failure to network-error", async () => {
    const http = makeHttp({
      get: vi.fn(async () => {
        throw new Error("boom");
      }),
    });
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");

    await expect(repo.getChildren()).rejects.toMatchObject({
      type: "network-error",
    });
  });

  it("returns no-child without touching HTTP when the caller cannot be identified", async () => {
    const http = makeHttp({});
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, null);

    await expect(repo.getChildren()).rejects.toMatchObject({
      type: "no-child",
    });
    expect(http.get).not.toHaveBeenCalled();
  });

  // ── US-E18.33: display names via IAM's tiered batch lookup (ADR-0120) ──

  it("resolves display names for EXACTLY the linked ids and renders them instead of the ordinal fallback", async () => {
    const http = makeHttp({ get: vi.fn(async () => LINKS) });
    const resolveNames = vi.fn(
      async () =>
        new Map([
          ["stu-a", "Nguyễn Minh Khoa"],
          ["stu-b", "Nguyễn Thu Hà"],
        ]),
    );
    const repo = new RealWeeklyTimetableRepository(
      http,
      resolveTermId,
      "me",
      resolveNames,
    );

    const children = await repo.getChildren();

    // Scoped: only the ids the parent's OWN link list produced, in stable order.
    expect(resolveNames).toHaveBeenCalledTimes(1);
    expect(resolveNames).toHaveBeenCalledWith(["stu-a", "stu-b"]);
    expect(children.map((c) => c.name)).toEqual([
      "Nguyễn Minh Khoa",
      "Nguyễn Thu Hà",
    ]);
    expect(children.map((c) => c.avatar)).toEqual(["NK", "NH"]);
  });

  it("keeps the ordinal fallback reachable when the name lookup fails — the roster still renders", async () => {
    const http = makeHttp({ get: vi.fn(async () => LINKS) });
    const repo = new RealWeeklyTimetableRepository(
      http,
      resolveTermId,
      "me",
      async () => {
        throw new Error("iam down");
      },
    );

    const children = await repo.getChildren();
    expect(children.map((c) => c.name)).toEqual([undefined, undefined]);
    expect(children.map((c) => c.avatar)).toEqual(["1", "2"]);
  });

  it("skips the name lookup entirely for an empty roster", async () => {
    const resolveNames = vi.fn(async () => new Map<string, string>());
    const http = makeHttp({ get: vi.fn(async () => ({ links: [] })) });
    const repo = new RealWeeklyTimetableRepository(
      http,
      resolveTermId,
      "me",
      resolveNames,
    );

    expect(await repo.getChildren()).toEqual([]);
    expect(resolveNames).not.toHaveBeenCalled();
  });

  it("stays constructible without a resolver (wire-level tests) — ordinal fallback, no crash", async () => {
    const http = makeHttp({ get: vi.fn(async () => LINKS) });
    const repo = new RealWeeklyTimetableRepository(http, resolveTermId, "me");
    expect((await repo.getChildren()).map((c) => c.name)).toEqual([
      undefined,
      undefined,
    ]);
  });
});

describe("HybridWeeklyTimetableRepository", () => {
  it("routes every wireable operation to the real repo, keeping only getByClass on mock", async () => {
    const week = { classId: "x", className: "", slots: {} };
    const real = {
      getByClass: vi.fn(),
      getByMember: vi.fn(async () => week),
      getByTeacher: vi.fn(async () => week),
      getMyTimetable: vi.fn(async () => week),
      getChildren: vi.fn(async () => []),
    };
    const mock = {
      getByClass: vi.fn(async () => week),
      getByMember: vi.fn(),
      getByTeacher: vi.fn(),
      getMyTimetable: vi.fn(),
      getChildren: vi.fn(),
    };
    const hybrid = new HybridWeeklyTimetableRepository(real, mock);

    await hybrid.getByTeacher();
    await hybrid.getMyTimetable();
    await hybrid.getChildren();
    await hybrid.getByMember("child-1", "2026-03-02");

    expect(real.getByTeacher).toHaveBeenCalled();
    expect(real.getMyTimetable).toHaveBeenCalled();
    expect(real.getChildren).toHaveBeenCalled();
    expect(real.getByMember).toHaveBeenCalledWith("child-1", "2026-03-02");
    expect(mock.getByTeacher).not.toHaveBeenCalled();
    expect(mock.getMyTimetable).not.toHaveBeenCalled();
    expect(mock.getChildren).not.toHaveBeenCalled();
    expect(mock.getByMember).not.toHaveBeenCalled();

    await hybrid.getByClass("11A2");
    expect(mock.getByClass).toHaveBeenCalledWith("11A2", undefined);
    expect(real.getByClass).not.toHaveBeenCalled();
  });
});
