import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { type ApiEnvelope, ApiError } from "@/bootstrap/lib/api-envelope";
import type { CalendarFailure } from "../../domain/failures/calendar.failure";
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

async function expectFailure(
  p: Promise<unknown>,
  type: CalendarFailure["type"],
) {
  await expect(p).rejects.toMatchObject({ type });
}

describe("CalendarRepository", () => {
  it("maps CALENDAR_ACTIVE_YEAR_EXISTS to active-year-exists on createYear", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(apiError("CALENDAR_ACTIVE_YEAR_EXISTS")),
    });
    const repo = new CalendarRepository(http);
    await expectFailure(
      repo.createYear({ label: "2026–2027", isActive: true }),
      "active-year-exists",
    );
  });

  it("maps CALENDAR_TERM_OVERLAP to date-overlap on createTerm", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(apiError("CALENDAR_TERM_OVERLAP")),
    });
    const repo = new CalendarRepository(http);
    await expectFailure(
      repo.createTerm("ay1", {
        name: "HK1",
        startDate: "2025-09-01",
        endDate: "2025-12-31",
      }),
      "date-overlap",
    );
  });

  it("maps CALENDAR_TERM_IN_USE to graded-term-delete on archiveTerm", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(apiError("CALENDAR_TERM_IN_USE")),
    });
    const repo = new CalendarRepository(http);
    await expectFailure(repo.archiveTerm("ay1", "t1"), "graded-term-delete");
  });

  it("maps CALENDAR_YEAR_NOT_FOUND to not-found-year on getYear", async () => {
    const http = makeHttp({
      get: vi.fn().mockRejectedValue(apiError("CALENDAR_YEAR_NOT_FOUND", 404)),
    });
    const repo = new CalendarRepository(http);
    await expectFailure(repo.getYear("missing"), "not-found-year");
  });

  it("maps an unknown error code to unknown", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(apiError("SOMETHING_ELSE")),
    });
    const repo = new CalendarRepository(http);
    await expectFailure(repo.activateYear("ay1"), "unknown");
  });

  it("listYears reads pagination from the raw envelope", async () => {
    const env: ApiEnvelope<
      Array<{
        id: string;
        label: string;
        isActive: boolean;
        terms: never[];
      }>
    > = {
      success: true,
      data: [{ id: "ay1", label: "2025–2026", isActive: true, terms: [] }],
      error: null,
      meta: { pagination: { nextCursor: "c2", hasMore: true } },
    };
    const get = vi.fn().mockResolvedValue(env);
    const repo = new CalendarRepository(makeHttp({ get }));

    const page = await repo.listYears();

    expect(get).toHaveBeenCalledWith(
      "/core/api/v1/academic-years",
      expect.objectContaining({ raw: true }),
    );
    expect(page.years).toHaveLength(1);
    expect(page.years[0].id).toBe("ay1");
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe("c2");
  });

  it("createYear maps the unwrapped payload to an AcademicYear entity", async () => {
    const http = makeHttp({
      post: vi.fn().mockResolvedValue({
        id: "ay9",
        label: "2027–2028",
        isActive: false,
        terms: [],
      }),
    });
    const repo = new CalendarRepository(http);

    const year = await repo.createYear({ label: "2027–2028", isActive: false });

    expect(year.id).toBe("ay9");
    expect(year.label).toBe("2027–2028");
    expect(year.isActive).toBe(false);
    expect(year.terms).toEqual([]);
  });

  it("getActiveYear returns null when BE reports the year is not found", async () => {
    const http = makeHttp({
      get: vi.fn().mockRejectedValue(apiError("CALENDAR_YEAR_NOT_FOUND", 404)),
    });
    const repo = new CalendarRepository(http);
    await expect(repo.getActiveYear()).resolves.toBeNull();
  });
});
