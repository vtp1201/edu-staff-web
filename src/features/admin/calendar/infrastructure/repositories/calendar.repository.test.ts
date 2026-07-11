import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { type ApiEnvelope, ApiError } from "@/bootstrap/lib/api-envelope";
import type { CalendarFailure } from "../../domain/failures/calendar.failure";
import type {
  AcademicYearResponseDto,
  TermResponseDto,
} from "../dtos/academic-year-response.dto";
import { CalendarRepository } from "./calendar.repository";

// The http interceptor unwraps the envelope (US-E06.1): repo calls resolve to
// the payload directly and reject with a normalised ApiError. The repo catches
// and re-throws a mapped CalendarFailure — assert on that mapped failure.
function apiError(code: string, status = 400) {
  return new ApiError({ code, message: code, retryable: false, status });
}

function makeHttp(over: Partial<AxiosInstance> = {}) {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    ...over,
  } as unknown as AxiosInstance;
}

function yearDto(
  over: Partial<AcademicYearResponseDto> = {},
): AcademicYearResponseDto {
  return {
    academicYearId: "ay1",
    tenantId: "tn1",
    label: "2025–2026",
    status: "DRAFT",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...over,
  };
}

function termDto(over: Partial<TermResponseDto> = {}): TermResponseDto {
  return {
    termId: "tm1",
    academicYearId: "ay1",
    tenantId: "tn1",
    name: "Học kỳ 1",
    startDate: "2025-09-01",
    endDate: "2025-12-31",
    status: "ACTIVE",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...over,
  };
}

function yearsEnvelope(
  data: AcademicYearResponseDto[],
  pagination?: { nextCursor: string | null; hasMore: boolean },
): ApiEnvelope<AcademicYearResponseDto[]> {
  return {
    success: true,
    data,
    error: null,
    meta: pagination ? { pagination } : {},
  };
}

async function expectFailure(
  p: Promise<unknown>,
  type: CalendarFailure["type"],
) {
  await expect(p).rejects.toMatchObject({ type });
}

describe("CalendarRepository — error-code matrix", () => {
  // Every CALENDAR_* code in ERROR_CODES.md → a specific failure variant.
  const cases: Array<[string, CalendarFailure["type"]]> = [
    ["CALENDAR_INVALID_TENANT_ID", "forbidden"],
    ["CALENDAR_INVALID_YEAR_ID", "not-found-year"],
    ["CALENDAR_INVALID_TERM_ID", "not-found-term"],
    ["CALENDAR_INVALID_LABEL", "invalid-label"],
    ["CALENDAR_INVALID_TERM_NAME", "invalid-term-name"],
    ["CALENDAR_INVALID_DATE_RANGE", "date-order"],
    ["CALENDAR_FORBIDDEN", "forbidden"],
    ["CALENDAR_YEAR_NOT_FOUND", "not-found-year"],
    ["CALENDAR_TERM_NOT_FOUND", "not-found-term"],
    ["CALENDAR_YEAR_LABEL_EXISTS", "year-label-exists"],
    ["CALENDAR_ACTIVE_YEAR_EXISTS", "active-year-exists"],
    ["CALENDAR_YEAR_ARCHIVED", "year-archived"],
    ["CALENDAR_TERM_OVERLAP", "date-overlap"],
    ["CALENDAR_TERM_IN_USE", "graded-term-delete"],
  ];

  for (const [code, type] of cases) {
    it(`maps ${code} → ${type}`, async () => {
      const http = makeHttp({
        post: vi.fn().mockRejectedValue(apiError(code)),
      });
      const repo = new CalendarRepository(http);
      await expectFailure(
        repo.createYear({ label: "x", isActive: false }),
        type,
      );
    });
  }

  it("maps NETWORK_ERROR → network-error", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(apiError("NETWORK_ERROR", 0)),
    });
    const repo = new CalendarRepository(http);
    await expectFailure(
      repo.createYear({ label: "x", isActive: false }),
      "network-error",
    );
  });

  it("maps an unknown error code → unknown", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(apiError("SOMETHING_ELSE")),
    });
    const repo = new CalendarRepository(http);
    await expectFailure(repo.activateYear("ay1"), "unknown");
  });

  it("CALENDAR_FORBIDDEN no longer maps to network-error", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(apiError("CALENDAR_FORBIDDEN", 403)),
    });
    const repo = new CalendarRepository(http);
    await expect(
      repo.createYear({ label: "x", isActive: false }),
    ).rejects.not.toMatchObject({ type: "network-error" });
  });
});

describe("CalendarRepository — listYears fan-out + ARCHIVED filter", () => {
  it("filters out ARCHIVED years and fans out to terms per remaining year", async () => {
    const env = yearsEnvelope(
      [
        yearDto({ academicYearId: "ay1", status: "ACTIVE" }),
        yearDto({ academicYearId: "ay2", status: "ARCHIVED" }),
        yearDto({ academicYearId: "ay3", status: "DRAFT" }),
      ],
      { nextCursor: "c2", hasMore: true },
    );
    const get = vi.fn(async (url: string, opts?: unknown) => {
      if (url === "/core/api/v1/academic-years") return env;
      if (url === "/core/api/v1/academic-years/ay1/terms")
        return [termDto({ termId: "t-ay1" })];
      if (url === "/core/api/v1/academic-years/ay3/terms")
        return [termDto({ termId: "t-ay3-a" }), termDto({ termId: "t-ay3-b" })];
      throw new Error(`unexpected GET ${url} ${JSON.stringify(opts)}`);
    });
    const repo = new CalendarRepository(makeHttp({ get: get as never }));

    const page = await repo.listYears();

    // ay2 (ARCHIVED) filtered out; no terms fetch for it.
    expect(page.years.map((y) => y.id)).toEqual(["ay1", "ay3"]);
    expect(page.years[0].isActive).toBe(true);
    expect(page.years[0].terms.map((t) => t.id)).toEqual(["t-ay1"]);
    expect(page.years[1].terms).toHaveLength(2);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe("c2");
    expect(get).not.toHaveBeenCalledWith(
      "/core/api/v1/academic-years/ay2/terms",
    );
  });

  it("requests the raw envelope for pagination", async () => {
    const get = vi.fn(async (url: string) => {
      if (url === "/core/api/v1/academic-years") return yearsEnvelope([]);
      throw new Error(`unexpected GET ${url}`);
    });
    const repo = new CalendarRepository(makeHttp({ get: get as never }));
    await repo.listYears();
    expect(get).toHaveBeenCalledWith(
      "/core/api/v1/academic-years",
      expect.objectContaining({ raw: true }),
    );
  });
});

describe("CalendarRepository — getYear / getActiveYear / activateYear fan-out", () => {
  it("getYear assembles flat year + its terms", async () => {
    const get = vi.fn(async (url: string) => {
      if (url === "/core/api/v1/academic-years/ay1")
        return yearDto({ academicYearId: "ay1", status: "ACTIVE" });
      if (url === "/core/api/v1/academic-years/ay1/terms")
        return [termDto({ termId: "tm1" })];
      throw new Error(`unexpected GET ${url}`);
    });
    const repo = new CalendarRepository(makeHttp({ get: get as never }));

    const year = await repo.getYear("ay1");
    expect(year.id).toBe("ay1");
    expect(year.isActive).toBe(true);
    expect(year.terms.map((t) => t.id)).toEqual(["tm1"]);
  });

  it("getActiveYear assembles the active year + terms", async () => {
    const get = vi.fn(async (url: string) => {
      if (url === "/core/api/v1/academic-years/active")
        return yearDto({ academicYearId: "ay1", status: "ACTIVE" });
      if (url === "/core/api/v1/academic-years/ay1/terms")
        return [termDto({ termId: "tm1" })];
      throw new Error(`unexpected GET ${url}`);
    });
    const repo = new CalendarRepository(makeHttp({ get: get as never }));

    const year = await repo.getActiveYear();
    expect(year?.id).toBe("ay1");
    expect(year?.terms).toHaveLength(1);
  });

  it("getActiveYear returns null when BE reports no active year (404)", async () => {
    const http = makeHttp({
      get: vi.fn().mockRejectedValue(apiError("CALENDAR_YEAR_NOT_FOUND", 404)),
    });
    const repo = new CalendarRepository(http);
    await expect(repo.getActiveYear()).resolves.toBeNull();
  });

  it("activateYear assembles the activated year + terms", async () => {
    const post = vi.fn(async () =>
      yearDto({ academicYearId: "ay1", status: "ACTIVE" }),
    );
    const get = vi.fn(async (url: string) => {
      if (url === "/core/api/v1/academic-years/ay1/terms")
        return [termDto({ termId: "tm1" })];
      throw new Error(`unexpected GET ${url}`);
    });
    const repo = new CalendarRepository(
      makeHttp({ post: post as never, get: get as never }),
    );

    const year = await repo.activateYear("ay1");
    expect(post).toHaveBeenCalledWith(
      "/core/api/v1/academic-years/ay1/activate",
    );
    expect(year.isActive).toBe(true);
    expect(year.terms.map((t) => t.id)).toEqual(["tm1"]);
  });
});

describe("CalendarRepository — createYear orchestration", () => {
  it("posts only { label } to the wire (drops isActive)", async () => {
    const post = vi.fn(async () =>
      yearDto({ academicYearId: "ay9", label: "2027–2028", status: "DRAFT" }),
    );
    const repo = new CalendarRepository(makeHttp({ post: post as never }));

    const year = await repo.createYear({ label: "2027–2028", isActive: false });

    expect(post).toHaveBeenCalledWith("/core/api/v1/academic-years", {
      label: "2027–2028",
    });
    expect(post).toHaveBeenCalledTimes(1);
    expect(year.id).toBe("ay9");
    expect(year.isActive).toBe(false);
    expect(year.terms).toEqual([]);
  });

  it("chains create + activate when isActive requested, returns the activated year", async () => {
    const post = vi.fn(async (url: string) => {
      if (url === "/core/api/v1/academic-years")
        return yearDto({ academicYearId: "ay9", status: "DRAFT" });
      if (url === "/core/api/v1/academic-years/ay9/activate")
        return yearDto({ academicYearId: "ay9", status: "ACTIVE" });
      throw new Error(`unexpected POST ${url}`);
    });
    const get = vi.fn(async (url: string) => {
      if (url === "/core/api/v1/academic-years/ay9/terms") return [];
      throw new Error(`unexpected GET ${url}`);
    });
    const repo = new CalendarRepository(
      makeHttp({ post: post as never, get: get as never }),
    );

    const year = await repo.createYear({ label: "2027–2028", isActive: true });

    expect(post).toHaveBeenNthCalledWith(1, "/core/api/v1/academic-years", {
      label: "2027–2028",
    });
    expect(post).toHaveBeenNthCalledWith(
      2,
      "/core/api/v1/academic-years/ay9/activate",
    );
    expect(year.isActive).toBe(true);
  });

  it("surfaces active-year-exists when the activate call conflicts (no rollback)", async () => {
    const post = vi.fn(async (url: string) => {
      if (url === "/core/api/v1/academic-years")
        return yearDto({ academicYearId: "ay9", status: "DRAFT" });
      if (url === "/core/api/v1/academic-years/ay9/activate")
        throw apiError("CALENDAR_ACTIVE_YEAR_EXISTS", 409);
      throw new Error(`unexpected POST ${url}`);
    });
    const repo = new CalendarRepository(makeHttp({ post: post as never }));

    await expectFailure(
      repo.createYear({ label: "2027–2028", isActive: true }),
      "active-year-exists",
    );
    // The DRAFT year was created and NOT rolled back (BE has no delete-year).
    expect(post).toHaveBeenNthCalledWith(1, "/core/api/v1/academic-years", {
      label: "2027–2028",
    });
  });
});

describe("CalendarRepository — term operations use new DTO fields", () => {
  it("createTerm maps termId → id and hasGrades false", async () => {
    const post = vi.fn(async () => termDto({ termId: "tm7" }));
    const repo = new CalendarRepository(makeHttp({ post: post as never }));
    const term = await repo.createTerm("ay1", {
      name: "HK1",
      startDate: "2025-09-01",
      endDate: "2025-12-31",
    });
    expect(term.id).toBe("tm7");
    expect(term.hasGrades).toBe(false);
  });

  it("listTerms maps the term DTO array", async () => {
    const get = vi.fn(async () => [
      termDto({ termId: "a" }),
      termDto({ termId: "b" }),
    ]);
    const repo = new CalendarRepository(makeHttp({ get: get as never }));
    const terms = await repo.listTerms("ay1");
    expect(terms.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("updateTerm maps the patched term DTO", async () => {
    const patch = vi.fn(async () => termDto({ termId: "tm3", name: "HK2" }));
    const repo = new CalendarRepository(makeHttp({ patch: patch as never }));
    const term = await repo.updateTerm("ay1", "tm3", { name: "HK2" });
    expect(term.id).toBe("tm3");
    expect(term.name).toBe("HK2");
  });
});
