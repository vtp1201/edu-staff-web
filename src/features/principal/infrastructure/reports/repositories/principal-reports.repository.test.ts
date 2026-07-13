/**
 * Integration tests — PrincipalReportsRepository (US-E03.1).
 * The http interceptor unwraps the envelope; repositories receive the payload
 * directly (or the full envelope for `{ raw: true }` list calls) and receive a
 * normalised ApiError on failure. Mock at that boundary; branch on error.code.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { PRINCIPAL_REPORTS_EP } from "@/bootstrap/endpoint/principal-reports.endpoint";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { PrincipalReportsFailure } from "@/features/principal/domain/reports/failures/principal-reports.failure";
import { PrincipalReportsRepository } from "./principal-reports.repository";

function apiError(code: string, status: number, retryable = false) {
  return new ApiError({ code, message: code, retryable, status });
}

function networkError() {
  return new ApiError({
    code: "NETWORK_ERROR",
    message: "offline",
    retryable: true,
  });
}

function httpWith(overrides: Partial<AxiosInstance>): AxiosInstance {
  return {
    get: vi.fn(),
    post: vi.fn(),
    ...overrides,
  } as unknown as AxiosInstance;
}

async function expectFailure(
  promise: Promise<unknown>,
  type: PrincipalReportsFailure["type"],
) {
  await expect(promise).rejects.toMatchObject({ type });
}

describe("PrincipalReportsRepository — summary (INT-001)", () => {
  it("unwraps the payload and maps to entity", async () => {
    const payload = {
      totalStudents: 1248,
      totalStudentsTrend: 2.1,
      schoolAverage: 7.42,
      schoolAverageTrend: null,
      attendanceRate: 96.4,
      attendanceRateTrend: -0.5,
      incidentCount: 23,
      incidentCountTrend: null,
    };
    const get = vi.fn().mockResolvedValue(payload);
    const repo = new PrincipalReportsRepository(httpWith({ get }));
    const result = await repo.getReportsSummary("HK2");
    expect(get).toHaveBeenCalledWith(PRINCIPAL_REPORTS_EP.summary, {
      params: { termId: "HK2" },
    });
    expect(result.schoolAverageTrend).toBeNull();
    expect(result.totalStudents).toBe(1248);
  });

  it("maps a network error to network-error failure", async () => {
    const get = vi.fn().mockRejectedValue(networkError());
    const repo = new PrincipalReportsRepository(httpWith({ get }));
    await expectFailure(repo.getReportsSummary("HK2"), "network-error");
  });

  it("maps TERM_NOT_FOUND to term-not-found failure", async () => {
    const get = vi.fn().mockRejectedValue(apiError("TERM_NOT_FOUND", 404));
    const repo = new PrincipalReportsRepository(httpWith({ get }));
    await expectFailure(repo.getReportsSummary("HK1"), "term-not-found");
  });

  it("maps a 403 to unauthorized failure", async () => {
    const get = vi.fn().mockRejectedValue(apiError("FORBIDDEN", 403));
    const repo = new PrincipalReportsRepository(httpWith({ get }));
    await expectFailure(repo.getReportsSummary("HK1"), "unauthorized");
  });
});

describe("PrincipalReportsRepository — charts (INT-002/003)", () => {
  it("reads subjects from the `{ subjects }` payload", async () => {
    const get = vi.fn().mockResolvedValue({
      subjects: [{ subjectId: "s1", subjectName: "Toán", average: 7.8 }],
    });
    const repo = new PrincipalReportsRepository(httpWith({ get }));
    const result = await repo.getSubjectAverages("HK2");
    expect(get).toHaveBeenCalledWith(PRINCIPAL_REPORTS_EP.subjectAverages, {
      params: { termId: "HK2" },
    });
    expect(result).toHaveLength(1);
    expect(result[0].subjectName).toBe("Toán");
  });

  it("reads weeks from the `{ weeks }` payload", async () => {
    const get = vi.fn().mockResolvedValue({
      weeks: [{ weekLabel: "T1", rate: 97.2 }],
    });
    const repo = new PrincipalReportsRepository(httpWith({ get }));
    const result = await repo.getAttendanceTrend("HK2");
    expect(result[0].rate).toBe(97.2);
  });
});

describe("PrincipalReportsRepository — list (INT-004, cursor)", () => {
  it("reads items + pagination from the raw envelope", async () => {
    const envelope = {
      success: true,
      data: [
        {
          id: "r1",
          name: "Báo cáo",
          term: "HK2",
          createdAt: "2026-03-20T02:00:00.000Z",
          status: "ready",
        },
      ],
      error: null,
      meta: {
        requestId: "req-1",
        timestamp: "t",
        pagination: { nextCursor: "cur-2", hasMore: true },
      },
    };
    const get = vi.fn().mockResolvedValue(envelope);
    const repo = new PrincipalReportsRepository(httpWith({ get }));
    const page = await repo.getPeriodicReports("HK2", "cur-1");
    expect(get).toHaveBeenCalledWith(PRINCIPAL_REPORTS_EP.list, {
      params: { termId: "HK2", cursor: "cur-1" },
      raw: true,
    });
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBe("cur-2");
    expect(page.hasMore).toBe(true);
  });

  it("maps a list network error to network-error failure", async () => {
    const get = vi.fn().mockRejectedValue(networkError());
    const repo = new PrincipalReportsRepository(httpWith({ get }));
    await expectFailure(repo.getPeriodicReports("HK2"), "network-error");
  });
});

describe("PrincipalReportsRepository — generate (INT-005)", () => {
  it("POSTs termId and maps the generating row", async () => {
    const post = vi.fn().mockResolvedValue({
      id: "r-new",
      name: "Báo cáo",
      term: "HK2",
      createdAt: "2026-07-13T00:00:00.000Z",
      status: "generating",
    });
    const repo = new PrincipalReportsRepository(httpWith({ post }));
    const row = await repo.generateReport("HK2");
    expect(post).toHaveBeenCalledWith(PRINCIPAL_REPORTS_EP.generate, {
      termId: "HK2",
    });
    expect(row.status).toBe("generating");
  });

  it("maps a generate failure to generation-failed", async () => {
    const post = vi.fn().mockRejectedValue(apiError("SERVER_ERROR", 500, true));
    const repo = new PrincipalReportsRepository(httpWith({ post }));
    await expectFailure(repo.generateReport("HK2"), "generation-failed");
  });
});
