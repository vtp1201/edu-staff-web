/**
 * Integration tests — PeriodLogRepository ↔ HTTP boundary (US-E24.9).
 * The interceptor unwraps the envelope, so the repo receives the payload
 * directly and a normalised `ApiError` on failure. Asserts the PUT body shape,
 * the DELETE **query-param** shape (termId/academicYearId are NOT a body), and
 * every BE error code → failure branch (ground-truthed against core's
 * `ERROR_CODES.md`, never invented).
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, type Mock, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { PeriodLogResponseDto } from "../dtos/period-log-response.dto";
import type { PeriodPrepResponseDto } from "../dtos/period-prep-response.dto";
import { PeriodLogRepository } from "./period-log.repository";

function apiError(code: string, status: number) {
  return new ApiError({ code, message: code, retryable: false, status });
}

type SpyHttp = AxiosInstance & { get: Mock; put: Mock; delete: Mock };

function makeHttp(over: Partial<Record<"get" | "put" | "delete", Mock>> = {}) {
  return {
    get: vi.fn().mockResolvedValue([]),
    put: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    ...over,
  } as unknown as SpyHttp;
}

const logDto: PeriodLogResponseDto = {
  classId: "c-1",
  date: "2026-09-07",
  periodNumber: 2,
  termId: "t-1",
  dayOfWeek: "MON",
  subjectId: "s-1",
  teacherMemberId: "m-1",
  lessonTitle: "Đạo hàm",
  remark: "",
  grade: "A",
  absentCount: 1,
  createdAt: "2026-09-07T01:00:00Z",
  updatedAt: "2026-09-07T01:00:00Z",
};

const prepDto: PeriodPrepResponseDto = {
  classId: "c-1",
  date: "2026-09-07",
  periodNumber: 2,
  termId: "t-1",
  dayOfWeek: "MON",
  subjectId: "s-1",
  teacherMemberId: "m-1",
  note: "Ôn tập",
  lessonPlanId: null,
  materials: [{ title: "GeoGebra", url: "https://geogebra.org" }],
  createdAt: "2026-09-07T01:00:00Z",
  updatedAt: "2026-09-07T01:00:00Z",
};

const CTX = { termId: "t-1", academicYearId: "y-1" };

describe("PeriodLogRepository — period-log reads/writes", () => {
  it("listPeriodLogs sends from/to as query params and maps the rows", async () => {
    const http = makeHttp({ get: vi.fn().mockResolvedValue([logDto]) });
    const repo = new PeriodLogRepository(http);

    const rows = await repo.listPeriodLogs("c-1", "2026-09-07", "2026-09-12");

    expect(rows).toHaveLength(1);
    expect(rows[0].lessonTitle).toBe("Đạo hàm");
    expect(http.get.mock.calls[0][0]).toBe(
      "/core/api/v1/classes/c-1/period-logs",
    );
    expect(http.get.mock.calls[0][1]).toEqual({
      params: { from: "2026-09-07", to: "2026-09-12" },
    });
  });

  it("listPeriodLogs tolerates a null payload (no rows) without throwing", async () => {
    const http = makeHttp({ get: vi.fn().mockResolvedValue(null) });

    await expect(
      new PeriodLogRepository(http).listPeriodLogs("c-1", "a", "b"),
    ).resolves.toEqual([]);
  });

  it("savePeriodLog PUTs the full replace body incl. termId + academicYearId", async () => {
    const http = makeHttp({ put: vi.fn().mockResolvedValue(logDto) });
    const repo = new PeriodLogRepository(http);

    const saved = await repo.savePeriodLog("c-1", "2026-09-07", 2, CTX, {
      lessonTitle: "Đạo hàm",
      remark: "Lớp ổn",
      grade: "B",
      absentCount: 3,
    });

    expect(saved.teacherMemberId).toBe("m-1");
    expect(http.put.mock.calls[0][0]).toBe(
      "/core/api/v1/classes/c-1/period-logs/2026-09-07/2",
    );
    expect(http.put.mock.calls[0][1]).toEqual({
      termId: "t-1",
      academicYearId: "y-1",
      lessonTitle: "Đạo hàm",
      remark: "Lớp ổn",
      grade: "B",
      absentCount: 3,
    });
  });

  it('savePeriodLog sends remark as "" when omitted (wire has no null)', async () => {
    const http = makeHttp({ put: vi.fn().mockResolvedValue(logDto) });

    await new PeriodLogRepository(http).savePeriodLog(
      "c-1",
      "2026-09-07",
      2,
      CTX,
      { lessonTitle: "T", grade: "A", absentCount: 0 },
    );

    expect(http.put.mock.calls[0][1].remark).toBe("");
  });

  it("deletePeriodLog sends termId + academicYearId as QUERY params, never a body", async () => {
    const http = makeHttp();

    await new PeriodLogRepository(http).deletePeriodLog(
      "c-1",
      "2026-09-07",
      2,
      CTX,
    );

    expect(http.delete.mock.calls[0][0]).toBe(
      "/core/api/v1/classes/c-1/period-logs/2026-09-07/2",
    );
    expect(http.delete.mock.calls[0][1]).toEqual({
      params: { termId: "t-1", academicYearId: "y-1" },
    });
  });
});

describe("PeriodLogRepository — period-prep reads/writes", () => {
  it("listPeriodPreps maps materials + null lessonPlanId", async () => {
    const http = makeHttp({ get: vi.fn().mockResolvedValue([prepDto]) });

    const rows = await new PeriodLogRepository(http).listPeriodPreps(
      "c-1",
      "2026-09-07",
      "2026-09-12",
    );

    expect(rows[0].lessonPlanId).toBeNull();
    expect(rows[0].materials).toEqual([
      { title: "GeoGebra", url: "https://geogebra.org" },
    ]);
    expect(http.get.mock.calls[0][0]).toBe(
      "/core/api/v1/classes/c-1/period-preps",
    );
  });

  it("savePeriodPrep PUTs note/lessonPlanId/materials as a full replace", async () => {
    const http = makeHttp({ put: vi.fn().mockResolvedValue(prepDto) });

    await new PeriodLogRepository(http).savePeriodPrep(
      "c-1",
      "2026-09-07",
      2,
      CTX,
      {
        note: "Ôn tập",
        lessonPlanId: "lp-1",
        materials: [{ title: "GeoGebra", url: "https://geogebra.org" }],
      },
    );

    expect(http.put.mock.calls[0][0]).toBe(
      "/core/api/v1/classes/c-1/period-preps/2026-09-07/2",
    );
    expect(http.put.mock.calls[0][1]).toEqual({
      termId: "t-1",
      academicYearId: "y-1",
      note: "Ôn tập",
      lessonPlanId: "lp-1",
      materials: [{ title: "GeoGebra", url: "https://geogebra.org" }],
    });
  });

  it("savePeriodPrep omits lessonPlanId entirely when unset (never sends null)", async () => {
    const http = makeHttp({ put: vi.fn().mockResolvedValue(prepDto) });

    await new PeriodLogRepository(http).savePeriodPrep(
      "c-1",
      "2026-09-07",
      2,
      CTX,
      { materials: [] },
    );

    expect(http.put.mock.calls[0][1]).not.toHaveProperty("lessonPlanId");
    expect(http.put.mock.calls[0][1].note).toBe("");
  });

  it("deletePeriodPrep sends the term context as query params", async () => {
    const http = makeHttp();

    await new PeriodLogRepository(http).deletePeriodPrep(
      "c-1",
      "2026-09-07",
      2,
      CTX,
    );

    expect(http.delete.mock.calls[0][1]).toEqual({
      params: { termId: "t-1", academicYearId: "y-1" },
    });
  });
});

describe("PeriodLogRepository — failure mapping (branch on code, never message)", () => {
  const cases: [string, number, string][] = [
    ["PERIOD_LOG_NO_SLOT", 422, "slot-forbidden-or-missing"],
    ["PERIOD_PREP_NO_SLOT", 422, "slot-forbidden-or-missing"],
    ["PERIOD_LOG_TERM_MISMATCH", 409, "term-mismatch"],
    ["PERIOD_PREP_TOO_MANY_MATERIALS", 400, "too-many-materials"],
    ["PERIOD_PREP_LESSON_PLAN_NOT_OWNED", 400, "lesson-plan-not-owned"],
    ["PERIOD_LOG_INVALID_LESSON_TITLE", 400, "validation"],
    ["PERIOD_LOG_INVALID_REMARK", 400, "validation"],
    ["PERIOD_LOG_INVALID_GRADE", 400, "validation"],
    ["PERIOD_LOG_INVALID_ABSENT_COUNT", 400, "validation"],
    ["PERIOD_PREP_INVALID_NOTE", 400, "validation"],
    ["PERIOD_PREP_INVALID_MATERIAL", 400, "validation"],
    ["VALIDATION_FAILED", 422, "validation"],
    ["PERIOD_LOG_NOT_FOUND", 404, "not-found"],
    ["PERIOD_PREP_NOT_FOUND", 404, "not-found"],
    ["SOMETHING_ELSE", 500, "unknown"],
  ];

  it.each(cases)("%s (%i) → %s", async (code, status, expected) => {
    const http = makeHttp({
      put: vi.fn().mockRejectedValue(apiError(code, status)),
    });

    await expect(
      new PeriodLogRepository(http).savePeriodLog("c-1", "d", 1, CTX, {
        lessonTitle: "T",
        grade: "A",
        absentCount: 0,
      }),
    ).rejects.toEqual({ type: expected });
  });

  it("a 403 is indistinguishable from the fused 422 (no occupancy oracle)", async () => {
    const http = makeHttp({
      put: vi.fn().mockRejectedValue(apiError("FORBIDDEN", 403)),
    });

    await expect(
      new PeriodLogRepository(http).savePeriodLog("c-1", "d", 1, CTX, {
        lessonTitle: "T",
        grade: "A",
        absentCount: 0,
      }),
    ).rejects.toEqual({ type: "slot-forbidden-or-missing" });
  });

  it("a transport failure (no status) maps to network-error", async () => {
    const http = makeHttp({
      get: vi.fn().mockRejectedValue(new Error("offline")),
    });

    await expect(
      new PeriodLogRepository(http).listPeriodLogs("c-1", "a", "b"),
    ).rejects.toEqual({ type: "network-error" });
  });
});
